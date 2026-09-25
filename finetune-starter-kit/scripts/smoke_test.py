"""
Smoke test: confirms the Aya download, language filtering, format
conversion, dedup/filter, and train/val/test split all work — WITHOUT
loading the model or touching a GPU. Run this first, before train.py,
to catch data-pipeline problems cheaply.

The dataset is read in STREAMING mode and only a bounded sample
(SAMPLE_ROWS) is pulled, so this never downloads the full ~204k-row
corpus to local disk. The pipeline logic under test is unchanged — it is
the same dedup/filter/split code the real run uses.

What it checks:
  1. CohereForAI/aya_dataset loads and has the expected columns
  2. English/Hausa/Igbo/Yoruba rows exist and counts are sane
  3. Conversion to {"conversations": [...], "language": ...} works
  4. dedup/filter in prepare_data.py don't wipe out everything
  5. train/val/test split produces non-empty splits for every language
  6. a sample record per language prints correctly (sanity check on
     scripts/diacritics rendering)

Usage:
    python scripts/smoke_test.py
"""
import itertools
import sys
import time
import yaml

# The sample-record step prints raw Igbo/Yoruba text containing diacritics
# (e.g. U+1ECB). On Windows the default console codepage is cp1252, which
# cannot encode those and raises UnicodeEncodeError, killing the run before
# the split checks. Force UTF-8 output and fall back to replacement chars
# rather than crashing.
for _stream in (sys.stdout, sys.stderr):
    if hasattr(_stream, "reconfigure"):
        try:
            _stream.reconfigure(encoding="utf-8", errors="replace")
        except (ValueError, OSError):
            pass

# Rows pulled off the stream for this smoke test. Keep this in the
# low-thousands: it needs to be big enough to survive dedup/filter and
# still yield non-empty train/val/test splits per language, but small
# enough that the run stays quick and downloads almost nothing.
SAMPLE_ROWS = 4000

# Streaming reads go over HTTP and are occasionally flaky (transient DNS
# failures / dropped range requests). Retry with a short backoff so an
# infrastructure hiccup doesn't look like a data-pipeline bug.
LOAD_ATTEMPTS = 6
LOAD_BACKOFF_SECONDS = 3


def load_config(path="config/config.yaml"):
    with open(path) as f:
        return yaml.safe_load(f)


def check(label, condition):
    status = "PASS" if condition else "FAIL"
    print(f"  [{status}] {label}")
    return condition


def main():
    ok = True

    # IMPORTANT: this is a SAMPLE, not the full dataset.
    # We stream only the first SAMPLE_ROWS rows instead of downloading all
    # ~204k, so the per-language counts printed below are SAMPLE counts —
    # they are proportional/estimated, NOT the true totals, and the
    # imbalance ratio between languages will be noisy at this size.
    # Real per-language row counts only come from a full
    # `python data/build_dataset.py` run. What this smoke test actually
    # validates is that the pipeline is wired up correctly: columns,
    # filtering, conversion, dedup, and the split all work end to end.

    # --- Step 1: build_dataset.py logic, but inline and verbose ---
    print("\n=== 1. Loading CohereForAI/aya_dataset (streaming sample) ===")
    raw = None
    last_err = None
    for attempt in range(1, LOAD_ATTEMPTS + 1):
        try:
            from datasets import Dataset, load_dataset
            stream = load_dataset("CohereForAI/aya_dataset", split="train", streaming=True)
            # Take a bounded head of the stream instead of the whole dataset.
            # The Aya stream is language-interleaved, so the head covers many
            # languages rather than one contiguous block.
            stream_iter = iter(stream)
            sample = list(itertools.islice(stream_iter, SAMPLE_ROWS))
            del stream_iter
            del stream
            # Re-wrap in a Dataset so the real pipeline helpers behave
            # identically: dedup() calls .select(), filter_empty_or_short()
            # calls .filter(), and split_one() calls .shuffle()/.select().
            raw = Dataset.from_list(sample)
            break
        except Exception as e:
            last_err = e
            if attempt < LOAD_ATTEMPTS:
                print(f"  [RETRY] streaming read failed "
                      f"({type(e).__name__}), attempt {attempt + 1}/{LOAD_ATTEMPTS}...")
                time.sleep(LOAD_BACKOFF_SECONDS)
    if raw is None:
        print(f"  [FAIL] could not load dataset: {last_err}")
        print("\n  If this is a network/auth error, confirm you can reach "
              "huggingface.co from this machine and are logged in if needed:")
        print("    huggingface-cli login")
        sys.exit(1)

    ok &= check(
        f"streamed {len(raw)} sampled rows (full dataset is ~204k, not downloaded)",
        len(raw) > 0,
    )
    ok &= check(
        "has expected columns (inputs/targets/language_code)",
        {"inputs", "targets", "language_code"}.issubset(set(raw.column_names)),
    )

    print("\n=== 2. Filtering to English/Hausa/Igbo/Yoruba ===")
    print("    (sample counts — proportional estimates, not true dataset totals)")
    target = {"eng": "English", "hau": "Hausa", "ibo": "Igbo", "yor": "Yoruba"}
    filtered = raw.filter(lambda ex: ex["language_code"] in target)
    ok &= check(f"kept {len(filtered)} sampled rows across 4 languages", len(filtered) > 0)

    counts = {}
    for code, name in target.items():
        n = len(filtered.filter(lambda ex, c=code: ex["language_code"] == c))
        counts[name] = n
        print(f"    {name:<10} {n} rows")
    ok &= check("every target language has at least 1 row", all(v > 0 for v in counts.values()))
    if counts:
        biggest, smallest = max(counts.values()), min(v for v in counts.values() if v > 0)
        if smallest and biggest / smallest > 5:
            print(f"    [NOTE] language counts are imbalanced "
                  f"({biggest} vs {smallest}) — consider upsampling before training")

    print("\n=== 3. Converting to conversations format ===")
    def to_conv(ex):
        return {
            "conversations": [
                {"from": "human", "value": ex["inputs"]},
                {"from": "gpt", "value": ex["targets"]},
            ],
            "language": target[ex["language_code"]],
        }
    converted = filtered.map(to_conv, remove_columns=filtered.column_names)
    ok &= check(
        "conversion produced conversations + language columns",
        {"conversations", "language"}.issubset(set(converted.column_names)),
    )

    print("\n  Sample record per language:")
    for name in target.values():
        subset = converted.filter(lambda ex, n=name: ex["language"] == n)
        if len(subset) == 0:
            continue
        sample = subset[0]
        human_turn = sample["conversations"][0]["value"]
        print(f"    [{name}] {human_turn[:80]}{'...' if len(human_turn) > 80 else ''}")

    print("\n=== 4. Dedup + empty/short filter ===")
    sys.path.insert(0, ".")
    from data.prepare_data import dedup, filter_empty_or_short
    cleaned = dedup(converted)
    cleaned = filter_empty_or_short(cleaned)
    ok &= check(f"{len(cleaned)} rows survive cleaning (from {len(converted)})", len(cleaned) > 0)
    ok &= check("cleaning didn't wipe out most of the data (>50% retained)",
                len(cleaned) / max(len(converted), 1) > 0.5)

    print("\n=== 5. Train/val/test split ===")
    from data.split_data import split_one
    for name in target.values():
        subset = cleaned.filter(lambda ex, n=name: ex["language"] == n)
        if len(subset) == 0:
            print(f"    [SKIP] {name}: no rows after cleaning")
            ok = False
            continue
        tr, va, te = split_one(subset, 0.1, 0.1, seed=3407)
        non_empty = len(tr) > 0 and len(va) > 0 and len(te) > 0
        ok &= check(f"{name}: train={len(tr)} val={len(va)} test={len(te)}", non_empty)

    print("\n" + "=" * 50)
    if ok:
        print("ALL CHECKS PASSED — safe to run the real pipeline:")
        print("  python data/build_dataset.py")
        print("  python data/prepare_data.py --config config/config.yaml")
        print("  python data/split_data.py --config config/config.yaml")
        import os
        os._exit(0)
    else:
        print("SOME CHECKS FAILED — fix the issues above before training.")
        sys.exit(1)


if __name__ == "__main__":
    main()
