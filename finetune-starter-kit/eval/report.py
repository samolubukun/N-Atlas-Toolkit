"""
Turn eval results into a single readable report, formatted like N-ATLaS's own
published eval table so results are easy to compare against it.

Two modes:

  Single model (default) — reads eval/results.json, which eval/run_eval.py
      writes for one checkpoint.

  Comparison (--compare) — reads eval/comparison.json, which eval/compare.py
      writes, and shows base vs fine-tuned side by side with a delta column.
      This is the worked example: it answers "did the fine-tune help?".

Usage:
    python eval/report.py
    python eval/report.py --compare eval/comparison.json
    python eval/report.py --rubric eval/rubric_filled.csv
"""
import argparse
import csv
import json
import os

DEFAULT_SCORED_CSV = "eval/rubric_scored.csv"
DEFAULT_COMPARISON = "eval/comparison.json"


def load_results(path="eval/results.json"):
    with open(path) as f:
        return json.load(f)


def load_rubric(path):
    if not path or not os.path.exists(path):
        return None
    with open(path) as f:
        return list(csv.DictReader(f))


def report_comparison(path):
    """Base vs fine-tuned table, grouped by metric family.

    Imports the delta classifier from compare.py so a report can never
    disagree with the harness about which direction is an improvement.
    """
    from eval.deltas import classify, format_delta

    if not os.path.exists(path):
        raise SystemExit(f"{path} not found — run eval/compare.py first")

    with open(path, encoding="utf-8") as f:
        payload = json.load(f)

    base = payload.get("base", {})
    tuned = payload.get("tuned", {})
    deltas = payload.get("deltas", {})

    print("=" * 74)
    print("BASE vs FINE-TUNED COMPARISON")
    print("=" * 74)
    print(f"base  : {base.get('model', '?')}")
    print(f"tuned : {tuned.get('model', '?')}")

    def is_loss(k):
        return k == "overall.loss" or (k.startswith("by_language.") and k.endswith(".loss"))

    def is_ppl(k):
        return k == "overall.perplexity" or (
            k.startswith("by_language.") and k.endswith(".perplexity"))

    def is_bench(k):
        return k.startswith("benchmarks.") and k.endswith(".accuracy")

    def is_custom(k):
        return k.startswith("custom_testset.") and k.endswith(".accuracy")

    families = [
        ("Held-out perplexity (lower is better)", is_ppl),
        ("Held-out loss (lower is better)", is_loss),
        ("Published benchmark accuracy (higher is better)", is_bench),
        ("Custom QA test set accuracy (higher is better)", is_custom),
    ]

    shown = 0
    for title, keep in families:
        chosen = sorted(k for k in deltas if keep(k))
        if not chosen:
            continue
        shown += 1
        print(f"\n{title}")
        print(f"{'metric':<44}{'base':>9}{'tuned':>10}{'delta':>12}")
        print("-" * 74)
        for key in chosen:
            entry = deltas[key]
            kind = classify(key, entry["delta"])
            mark = ""
            if kind == "up-good":
                mark = "  improved"
            elif kind == "down-bad":
                mark = "  REGRESSED"
            print(f"{key:<44}{entry['base']:>9.4f}{entry['tuned']:>10.4f}"
                  f"{format_delta(key, entry):>12}{mark}")

    if not shown:
        print("\n(no numeric deltas found — was the comparison run with any "
              "metrics enabled?)")
        return

    regressions = [k for k, v in deltas.items()
                   if classify(k, v["delta"]) == "down-bad"]
    print()
    if regressions:
        print("Regressed metrics (investigate before shipping the adapter):")
        for key in sorted(regressions):
            print(f"  - {key}: {deltas[key]['delta']:+.4f}")
    else:
        print("No metric regressed.")

    print("\nNote: perplexity is a proxy, not a quality score. The custom QA "
          "set and the benchmark are the numbers to quote.")


def main(rubric_path, comparison_path):
    if comparison_path:
        if not os.path.exists(comparison_path):
            raise SystemExit(
                f"{comparison_path} not found — run eval/compare.py first")
        report_comparison(comparison_path)
        return

    results = load_results()

    # If no explicit --rubric was given, pick up judge output automatically
    # so an eval run that used the LLM judge needs no extra flags.
    if not rubric_path and os.path.exists(DEFAULT_SCORED_CSV):
        rubric_path = DEFAULT_SCORED_CSV
        print(f"[report] using {DEFAULT_SCORED_CSV} (LLM-judge output)")

    print("=" * 60)
    print("EVAL REPORT")
    print("=" * 60)

    if "overall" in results:
        print(f"\nOverall — loss: {results['overall']['loss']:.4f}, "
              f"perplexity: {results['overall']['perplexity']:.2f}")

    if "by_language" in results:
        print("\nPer-language perplexity:")
        print(f"{'Language':<12}{'Loss':<10}{'Perplexity':<12}")
        for lang, vals in results["by_language"].items():
            print(f"{lang:<12}{vals['loss']:<10.4f}{vals['perplexity']:<12.2f}")

    if "bias_probes" in results:
        print(f"\nBias probes: {len(results['bias_probes'])} pairs run — "
              "see eval/results.json for full completions. "
              "length_ratio far from 1.0 is a quick flag, not a verdict.")
        for p in results["bias_probes"]:
            print(f"  {p['id']:<25} length_ratio={p['length_ratio']:.2f}")

    rubric = load_rubric(rubric_path)
    if rubric:
        print("\nHuman/judge rubric scores (from CSV):")
        print(f"{'Language':<12}{'Fluency':<10}{'Coherence':<11}"
              f"{'Relevance':<11}{'Accuracy':<10}{'Bias':<8}{'Usefulness':<11}")
        for row in rubric:
            print(f"{row.get('language',''):<12}{row.get('fluency',''):<10}"
                  f"{row.get('coherence',''):<11}{row.get('relevance',''):<11}"
                  f"{row.get('accuracy',''):<10}{row.get('bias',''):<8}"
                  f"{row.get('usefulness',''):<11}")
    else:
        print("\nNo rubric scores available. Fluency/coherence/relevance/"
              "accuracy/usefulness need either the LLM judge or a human "
              "reviewer. Either set eval.run_llm_judge: true and rerun "
              "eval/run_eval.py, or fill out eval/rubric_template.csv and "
              "rerun with --rubric eval/rubric_filled.csv")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--rubric", default=None)
    parser.add_argument("--compare", default=None,
                        help="path to eval/comparison.json from eval/compare.py")
    args = parser.parse_args()
    main(args.rubric, args.compare)
