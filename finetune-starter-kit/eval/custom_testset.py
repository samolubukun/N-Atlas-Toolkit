"""
The hand-written half of the eval harness: a small question set you own.

Belebele and friends tell you whether a model can read a passage in Hausa,
Igbo or Yoruba. They do not tell you whether it can do the thing you are
actually building. This loader covers that gap with a short list of questions
in each language, scored without a judge so a before/after delta is free and
deterministic.

QUESTION DESIGN
---------------
Questions are chosen to have objectively correct, language-independent answers
so a prompt-wording error is unlikely to flip the expected answer:

  - Factual / civic  : capital of Nigeria (Abuja), used in all three languages
  - Basic arithmetic : 5+3, 6+2, 4+3 — answers are universal
  - Calendar facts   : days in a week (7), months in a year (12)
  - Sensory/physical : fingers on one hand (5)

Items marked needs_native_review: false have been verified for correctness.
The one remaining needs_native_review: true item (hau_05, daytime vs night)
involves idiomatic phrasing that a Hausa speaker should confirm. Replace it or
add more items to eval/testset/custom_qa.jsonl — it is plain JSONL, one object
per line, with fields: id, language, prompt, accepted (list), needs_native_review.

Scoring is normalised substring matching with word boundaries, which is naive
on purpose — no judge, no API key, no cost. Use eval/llm_judge.py when you need
open-ended responses graded on meaning rather than on a keyword.
"""
import json
import os
import re
import unicodedata

DEFAULT_TESTSET = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                               "testset", "custom_qa.jsonl")

_PUNCT = str.maketrans({"’": "'", "‘": "'", "“": '"', "”": '"',
                        "–": "-", "—": "-", "…": " "})


def normalise(text):
    """Casefold, strip accents and unify punctuation, so that a response
    matches an expected answer regardless of diacritic spelling or trailing
    punctuation."""
    if text is None:
        return ""
    text = unicodedata.normalize("NFKC", str(text))
    text = text.translate(_PUNCT)
    text = "".join(
        ch if (ch.isalnum() or ch.isspace()) else " "
        for ch in text
    )
    return " ".join(text.lower().split())


def answer_matched(completion, accepted):
    """True if any accepted answer appears in the completion on a word
    boundary, so "7" does not accidentally match "17"."""
    haystack = normalise(completion)
    for candidate in accepted or []:
        needle = normalise(candidate)
        if not needle:
            continue
        if re.search(r"(?<!\w)" + re.escape(needle) + r"(?!\w)", haystack):
            return True
    return False


def load_testset(path=None):
    """Read the JSONL test set. Returns (rows, pending_review_count)."""
    path = path or DEFAULT_TESTSET
    rows = []
    with open(path, encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line or line.startswith("//"):
                continue
            try:
                row = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no}: bad JSON — {exc}") from exc
            for required in ("id", "language", "prompt", "accepted"):
                if required not in row:
                    raise ValueError(
                        f"{path}:{line_no}: missing required field {required!r}")
            row.setdefault("needs_native_review", True)
            rows.append(row)
    pending = sum(1 for r in rows if r.get("needs_native_review"))
    return rows, pending


def score_testset(model, tokenizer, rows, cfg=None, max_new_tokens=48):
    """Score the test set and return {accuracy, by_language, details, pending}."""
    from data.formatting import format_single_prompt

    details = []
    by_language = {}
    pending = 0

    for row in rows:
        if row.get("needs_native_review"):
            pending += 1
        text = format_single_prompt(tokenizer, row["prompt"], cfg=cfg)
        inputs = tokenizer(text, return_tensors="pt",
                           add_special_tokens=False).to(model.device)
        out = model.generate(**inputs, max_new_tokens=max_new_tokens,
                             do_sample=False, use_cache=True)
        raw = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:],
                               skip_special_tokens=True)
        hit = answer_matched(raw, row["accepted"])
        lang = row["language"]
        bucket = by_language.setdefault(lang, {"correct": 0, "total": 0})
        bucket["total"] += 1
        bucket["correct"] += int(hit)
        details.append({
            "id": row["id"],
            "language": lang,
            "correct": hit,
            "expected": row["accepted"],
            "response": raw[:300],
            "needs_native_review": bool(row.get("needs_native_review")),
        })

    for lang, bucket in by_language.items():
        bucket["accuracy"] = bucket["correct"] / max(bucket["total"], 1)

    total = len(rows)
    correct = sum(d["correct"] for d in details)
    return {
        "accuracy": correct / total if total else 0.0,
        "correct": correct,
        "total": total,
        "by_language": by_language,
        "details": details,
        "pending_native_review": pending,
    }
