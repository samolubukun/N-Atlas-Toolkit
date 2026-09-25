"""
Evaluate a fine-tuned checkpoint on the held-out test split.

Runs:
  - perplexity / loss on the test set (overall + per-language if available)
  - bias probes (see bias_probes.py), if enabled in config

Does NOT run rubric scoring (fluency/coherence/relevance/accuracy/
usefulness) automatically — that needs either a human reviewer or an LLM
judge, neither of which is wired up here. See README for how to score
that part manually against eval/rubric_template.csv.

Usage:
    python eval/run_eval.py --config config/config.yaml --checkpoint outputs/checkpoints/final_adapters
"""
import argparse
import json
import math
import yaml
import torch
from datasets import load_from_disk

from data.formatting import get_formatted_tokenizer, make_formatting_func
from eval.bias_probes import run_bias_probes


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def compute_perplexity(model, tokenizer, dataset, max_seq_length):
    model.eval()
    total_loss, total_tokens = 0.0, 0
    with torch.no_grad():
        for ex in dataset:
            enc = tokenizer(
                ex["text"], return_tensors="pt", truncation=True,
                max_length=max_seq_length,
            ).to(model.device)
            out = model(**enc, labels=enc["input_ids"])
            n_tokens = enc["input_ids"].numel()
            total_loss += out.loss.item() * n_tokens
            total_tokens += n_tokens
    avg_loss = total_loss / max(total_tokens, 1)
    return {"loss": avg_loss, "perplexity": math.exp(avg_loss)}


def main(config_path: str, checkpoint: str):
    cfg = load_config(config_path)
    mcfg, ecfg = cfg["model"], cfg["eval"]

    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=checkpoint,
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    tokenizer = get_formatted_tokenizer(tokenizer, cfg)
    formatting_func = make_formatting_func(tokenizer, cfg)

    splits = load_from_disk("data/splits")
    test_ds = splits["test"].map(formatting_func, batched=True)

    results = {}

    if ecfg["run_perplexity"]:
        results["overall"] = compute_perplexity(model, tokenizer, test_ds, mcfg["max_seq_length"])
        print(f"[eval] overall perplexity: {results['overall']['perplexity']:.2f}")

        languages = cfg["data"].get("languages", ["all"])
        if languages != ["all"] and "language" in test_ds.column_names:
            results["by_language"] = {}
            for lang in languages:
                subset = test_ds.filter(lambda ex: ex["language"] == lang)
                if len(subset) == 0:
                    continue
                results["by_language"][lang] = compute_perplexity(
                    model, tokenizer, subset, mcfg["max_seq_length"]
                )
                print(f"[eval] {lang} perplexity: "
                      f"{results['by_language'][lang]['perplexity']:.2f}")

    if ecfg["run_bias_probes"]:
        results["bias_probes"] = run_bias_probes(model, tokenizer, cfg=cfg)

    if ecfg.get("run_llm_judge"):
        # Real scoring, not a stub — see eval/llm_judge.py. Reuses the model
        # already loaded above rather than paying for a second 8B load.
        from eval.llm_judge import score_rubric
        score_rubric(model, tokenizer, cfg, "eval/rubric_scored.csv",
                      n_samples=ecfg.get("judge_samples_per_language", 20))
        results["judge_csv"] = "eval/rubric_scored.csv"

    with open("eval/results.json", "w") as f:
        json.dump(results, f, indent=2)
    print("[save] eval/results.json")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    parser.add_argument("--checkpoint", default="outputs/checkpoints/final_adapters")
    args = parser.parse_args()
    main(args.config, args.checkpoint)
