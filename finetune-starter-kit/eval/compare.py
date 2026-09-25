"""
Base vs fine-tuned comparison — the worked example.

eval/run_eval.py scores one checkpoint. This scores the *base* model and the
*fine-tuned* model and reports the difference, which is the number that
actually answers "did my fine-tune help?".

What it measures, cheapest and most deterministic first:

  1. Perplexity / loss on the held-out test split, overall and per language.
     Loss down is good.
  2. Belebele multiple-choice accuracy per language (see benchmarks.py).
     A published benchmark, scored by exact letter match — no judge, no key.
  3. Your own short QA set (see custom_testset.py), per language. This is the
     part that reflects what you actually care about.
  4. Bias probes (see bias_probes.py), if enabled.

Lower loss, higher accuracy: deltas are reported with the direction of "good"
attached so the table is not misread.

English is included as a control. A fine-tune on Hausa/Igbo/Yoruba that
improves those three while wrecking English is a real failure mode, and you
only notice it if you measured it.

Two ways to point at the fine-tuned model:

  --adapter PATH   LoRA adapter dir. The base model is loaded once, scored,
                   then the adapter is attached and scored again. One 8B load.
  --tuned PATH     a full model dir (e.g. outputs/export/merged_16bit). The
                   base is loaded, scored and freed first, so peak memory
                   stays at one 8B model but the run takes two loads.

Usage:
    python eval/compare.py --adapter outputs/checkpoints/final_adapters
    python eval/compare.py --tuned outputs/export/merged_16bit --limit 100
    python eval/report.py --compare eval/comparison.json
"""
import argparse
import gc
import json
import os
import sys

import yaml

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from eval.benchmarks import load_benchmark, score_benchmark  # noqa: E402
from eval.custom_testset import load_testset, score_testset  # noqa: E402
from eval.deltas import compute_deltas, flatten_numbers  # noqa: E402,F401
from eval.deltas import classify, format_delta  # noqa: E402,F401
from eval.run_eval import compute_perplexity  # noqa: E402


def load_config(path):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


# --------------------------------------------------------------------------
# pure helpers live in eval/deltas.py so report.py can reuse them without
# importing torch. render_table stays here because it is console output.
# --------------------------------------------------------------------------

def render_table(deltas, title):
    """Print a base/tuned/delta table. Pure string building."""
    lines = ["", "=" * 74, title, "=" * 74,
             f"{'metric':<44}{'base':>9}{'tuned':>10}{'delta':>12}"]
    lines.append("-" * 74)
    if not deltas:
        lines.append("  (no comparable numeric metrics — was anything enabled?)")
    for key, entry in deltas.items():
        if key.startswith("bias_probes"):
            continue
        lines.append(
            f"{key:<44}{entry['base']:>9.4f}{entry['tuned']:>10.4f}"
            f"{format_delta(key, entry):>12}"
        )
    lines.append("-" * 74)
    lines.append("lower loss is better; accuracy in percentage points (pp)")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# model-touching parts
# --------------------------------------------------------------------------

def release_cuda():
    """Clear allocator cache so the next 8B load has room.

    Callers must drop their own references to the model first — this only
    collects what is already unreachable.
    """
    gc.collect()
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass


def evaluate_model(model, tokenizer, cfg, label, limit=0, run_benchmarks=True,
                   run_testset=True, run_bias=True):
    """Score one model. Returns a metrics dict shaped for compute_deltas."""
    from data.formatting import get_formatted_tokenizer
    from eval.bias_probes import run_bias_probes

    ccfg = cfg.get("eval", {}).get("compare", {}) or {}
    mcfg = cfg["model"]
    max_seq = mcfg["max_seq_length"]

    tokenizer = get_formatted_tokenizer(tokenizer, cfg)
    results = {"label": label}

    # 1. perplexity on the held-out split
    try:
        from datasets import load_from_disk
        splits = load_from_disk("data/splits")
        test_ds = splits["test"]
        if "text" not in test_ds.column_names and "conversations" in test_ds.column_names:
            from data.formatting import make_formatting_func
            test_ds = test_ds.map(make_formatting_func(tokenizer, cfg), batched=True)
        if "text" in test_ds.column_names:
            results["overall"] = compute_perplexity(model, tokenizer, test_ds, max_seq)
            print(f"  [{label}] overall perplexity "
                  f"{results['overall']['perplexity']:.2f}")
            languages = cfg["data"].get("languages", [])
            if languages != ["all"] and "language" in test_ds.column_names:
                results["by_language"] = {}
                for lang in languages:
                    subset = test_ds.filter(lambda ex, n=lang: ex["language"] == n)
                    if len(subset) == 0:
                        continue
                    results["by_language"][lang] = compute_perplexity(
                        model, tokenizer, subset, max_seq)
                    print(f"  [{label}]   {lang} perplexity "
                          f"{results['by_language'][lang]['perplexity']:.2f}")
        else:
            print(f"  [{label}] no 'text' column in data/splits — "
                  "skipping perplexity (did data/split_data.py run?)")
    except FileNotFoundError:
        print(f"  [{label}] data/splits not found — skipping perplexity")
    except Exception as exc:
        print(f"  [{label}] perplexity failed: {type(exc).__name__}: {exc}")

    # 2. published benchmark
    if run_benchmarks:
        bench = ccfg.get("benchmark_configs") or {}
        name = ccfg.get("benchmark_name", "facebook/belebele")
        split = ccfg.get("benchmark_split", "test")
        cap = limit or ccfg.get("benchmark_limit", 0)
        results["benchmarks"] = {"name": name, "by_language": {}}
        for lang, config_name in bench.items():
            rows, note = load_benchmark(name, config_name, split=split, limit=cap)
            if not rows:
                print(f"  [{label}] {lang}: {note}")
                results["benchmarks"]["by_language"][lang] = {"status": note}
                continue
            scored = score_benchmark(model, tokenizer, rows, cfg=cfg,
                                     max_new_tokens=ccfg.get("max_new_tokens", 8))
            scored.pop("details", None)
            results["benchmarks"]["by_language"][lang] = scored
            print(f"  [{label}] {lang} {name} accuracy "
                  f"{scored['accuracy'] * 100:.1f}% ({scored['correct']}/{scored['total']})")

    # 3. hand-written test set
    if run_testset:
        rows, pending = load_testset(ccfg.get("custom_testset") or None)
        if pending:
            print(f"  [{label}] WARNING: {pending}/{len(rows)} test-set prompts are "
                  "flagged needs_native_review — have a native speaker check "
                  "eval/testset/custom_qa.jsonl before trusting this number")
        scored = score_testset(model, tokenizer, rows, cfg=cfg)
        scored.pop("details", None)
        results["custom_testset"] = scored
        print(f"  [{label}] custom test set accuracy "
              f"{scored['accuracy'] * 100:.1f}% ({scored['correct']}/{scored['total']})")

    # 4. bias probes
    if run_bias and cfg.get("eval", {}).get("run_bias_probes"):
        try:
            results["bias_probes"] = run_bias_probes(model, tokenizer, cfg=cfg)
        except Exception as exc:
            print(f"  [{label}] bias probes failed: {type(exc).__name__}: {exc}")

    return results


def load_base(cfg):
    return load_any(cfg, cfg["model"]["base_model"])


def load_any(cfg, path):
    """Load any full model dir (the base, or a merged fine-tuned model)."""
    from unsloth import FastLanguageModel
    mcfg = cfg["model"]
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=path,
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    return model, tokenizer


def attach_adapter(model, adapter_path):
    from peft import PeftModel
    print(f"[compare] attaching adapter {adapter_path}")
    return PeftModel.from_pretrained(model, adapter_path, is_trainable=False)


def main(config_path, adapter, tuned, out_path, limit, skip_benchmarks,
         skip_testset, skip_bias):
    cfg = load_config(config_path)
    ccfg = cfg.get("eval", {}).get("compare", {}) or {}
    if not adapter and not tuned:
        raise SystemExit("need one of --adapter or --tuned")

    base_model, tokenizer = load_base(cfg)
    print(f"[compare] scoring BASE {cfg['model']['base_model']}")
    base_results = evaluate_model(
        base_model, tokenizer, cfg, "base", limit=limit,
        run_benchmarks=not skip_benchmarks, run_testset=not skip_testset,
        run_bias=not skip_bias)
    base_results["model"] = cfg["model"]["base_model"]

    if adapter:
        tuned_model = attach_adapter(base_model, adapter)
        tuned_label = f"base + {adapter}"
    else:
        base_model = tokenizer = None
        release_cuda()
        tuned_model, tokenizer = load_any(cfg, tuned)
        tuned_label = tuned

    print(f"[compare] scoring TUNED {tuned_label}")
    tuned_results = evaluate_model(
        tuned_model, tokenizer, cfg, "tuned", limit=limit,
        run_benchmarks=not skip_benchmarks, run_testset=not skip_testset,
        run_bias=not skip_bias)
    tuned_results["model"] = tuned_label

    payload = {
        "config": config_path,
        "base": base_results,
        "tuned": tuned_results,
        "deltas": compute_deltas(base_results, tuned_results),
    }
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    print(f"[save] {out_path}")

    print(render_table(payload["deltas"], "BASE vs FINE-TUNED"))
    print("\n[next] python eval/report.py --compare " + out_path)


if __name__ == "__main__":
    p = argparse.ArgumentParser(description=__doc__.split("\n")[1])
    p.add_argument("--config", default="config/config.yaml")
    p.add_argument("--adapter", default=None,
                   help="LoRA adapter dir; base is loaded once")
    p.add_argument("--tuned", default=None,
                   help="full model dir, e.g. outputs/export/merged_16bit")
    p.add_argument("--out", default="eval/comparison.json")
    p.add_argument("--limit", type=int, default=0,
                   help="cap benchmark questions per language (0 = all)")
    p.add_argument("--skip-benchmarks", action="store_true")
    p.add_argument("--skip-testset", action="store_true")
    p.add_argument("--skip-bias", action="store_true")
    args = p.parse_args()
    main(args.config, args.adapter, args.tuned, args.out, args.limit,
         args.skip_benchmarks, args.skip_testset, args.skip_bias)
