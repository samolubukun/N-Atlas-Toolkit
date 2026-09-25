"""
Optional LLM-judge rubric scoring.

Fills the SAME CSV schema as eval/rubric_template.csv (language, sample_id,
prompt, response, fluency, coherence, relevance, accuracy, bias,
usefulness, notes) so eval/report.py consumes it unchanged.

The six dimensions match the categories in N-ATLaS's published human eval
table, so a judged run and a hand-filled run are directly comparable.

Talks to any OpenAI-compatible /chat/completions endpoint, which covers
OpenAI, Groq, Together, OpenRouter, and local vLLM/Ollama servers.

IMPORTANT: an LLM judge is a proxy for the human eval, not a replacement
for it. Judge scores run systematically more generous and more compressed
than human annotators. Use them to compare your own runs against each
other; do not quote them as "N-ATLaS-equivalent" numbers.

Usage:
    python eval/llm_judge.py --config config/config.yaml \
        --checkpoint outputs/checkpoints/final_adapters
"""
import argparse
import csv
import json
import os
import re

import requests

RUBRIC_DIMENSIONS = ["fluency", "coherence", "relevance", "accuracy", "bias", "usefulness"]

FIELDNAMES = ["language", "sample_id", "prompt", "response",
              *RUBRIC_DIMENSIONS, "notes"]

JUDGE_SYSTEM_PROMPT = (
    "You are a strict evaluator of multilingual (English, Hausa, Igbo, Yoruba) "
    "model responses. Rate the RESPONSE on six dimensions, each an integer "
    "from 1 to 5:\n"
    "- fluency: is the text grammatical and natural in its language?\n"
    "- coherence: is it logically structured and internally consistent?\n"
    "- relevance: does it actually address the prompt?\n"
    "- accuracy: are the claims factually sound?\n"
    "- bias: 5 = free of stereotyping or unfair framing, 1 = heavily biased.\n"
    "- usefulness: how practically helpful is it to the reader?\n\n"
    "Judge the response on its own merits. Do not reward or penalise it for "
    "being in a particular language. Respond with ONLY a JSON object of the "
    "form {\"fluency\": n, \"coherence\": n, \"relevance\": n, \"accuracy\": n, "
    "\"bias\": n, \"usefulness\": n} and nothing else."
)


def load_config(path):
    import yaml
    with open(path) as f:
        return yaml.safe_load(f)


def judge_client_config(cfg):
    """Validate eval.run_llm_judge + the judge_* keys. Returns a client cfg
    dict, or None when the judge is switched off."""
    ecfg = cfg["eval"]
    if not ecfg.get("run_llm_judge"):
        return None
    client = {
        "model": ecfg.get("judge_model"),
        "base_url": ecfg.get("judge_base_url"),
        "api_key_env": ecfg.get("judge_api_key_env", "OPENAI_API_KEY"),
        "temperature": ecfg.get("judge_temperature", 0.0),
        "max_tokens": ecfg.get("judge_max_tokens", 700),
    }
    missing = [k for k in ("model", "base_url") if not client[k]]
    if missing:
        raise SystemExit(
            f"[judge] eval.run_llm_judge is true but these config keys are "
            f"unset: {', '.join('judge_' + m for m in missing)}"
        )
    if not os.environ.get(client["api_key_env"]):
        raise SystemExit(
            f"[judge] eval.run_llm_judge is true but the env var "
            f"{client['api_key_env']} is not set. Set it, or set "
            f"eval.run_llm_judge: false."
        )
    return client


def parse_scores(raw: str):
    """Pull a {dim: int} dict out of the judge's reply. Returns None if the
    reply can't be parsed into all six dimensions as 1-5 integers."""
    if not raw:
        return None
    # strip ```json fences if the model added them
    text = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.MULTILINE).strip()
    start = text.find("{")
    if start == -1:
        return None
    depth, end = 0, None
    for i, ch in enumerate(text[start:], start=start):
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        return None
    try:
        data = json.loads(text[start:end])
    except json.JSONDecodeError:
        return None
    scores = {}
    for dim in RUBRIC_DIMENSIONS:
        val = data.get(dim)
        if isinstance(val, bool) or not isinstance(val, (int, float)):
            return None
        val = int(round(val))
        if not 1 <= val <= 5:
            return None
        scores[dim] = val
    return scores


def call_judge(client, prompt_text, response_text, timeout=90):
    """One scoring call against an OpenAI-compatible endpoint."""
    api_key = os.environ[client["api_key_env"]]
    resp = requests.post(
        client["base_url"].rstrip("/") + "/chat/completions",
        headers={"Authorization": f"Bearer {api_key}",
                 "Content-Type": "application/json"},
        json={
            "model": client["model"],
            "messages": [
                {"role": "system", "content": JUDGE_SYSTEM_PROMPT},
                {"role": "user",
                 "content": f"PROMPT:\n{prompt_text}\n\nRESPONSE:\n{response_text}"},
            ],
            "temperature": client.get("temperature", 0.0),
            "max_tokens": client.get("max_tokens", 700),
        },
        timeout=timeout,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"]


def score_rubric(model, tokenizer, cfg, out_path, n_samples=20, limit=0):
    """Score the test split with the LLM judge and write the rubric CSV.

    Takes an already-loaded model/tokenizer so eval/run_eval.py can call
    this without paying for a second 8B load.
    """
    client = judge_client_config(cfg)
    if client is None:
        print("[judge] eval.run_llm_judge is false in config — nothing to do.")
        return None

    from datasets import load_from_disk
    from data.formatting import get_chat_format, format_single_prompt

    splits = load_from_disk("data/splits")
    test_ds = splits["test"]
    has_lang = "language" in test_ds.column_names
    languages = cfg["data"].get("languages", ["all"])
    if languages == ["all"]:
        languages = sorted(set(test_ds["language"])) if has_lang else ["all"]

    _, content_key, _, _ = get_chat_format(cfg)

    rows, failures = [], 0
    for lang in languages:
        subset = test_ds.filter(lambda ex, n=lang: ex["language"] == n) if has_lang else test_ds
        n = len(subset) if limit else min(n_samples, len(subset))
        for i in range(n):
            ex = subset[i]
            user_text = ex["conversations"][0][content_key]
            prompt_text = format_single_prompt(tokenizer, user_text, cfg=cfg)
            inputs = tokenizer(prompt_text, return_tensors="pt",
                               add_special_tokens=False).to(model.device)
            out = model.generate(**inputs, max_new_tokens=256, use_cache=True)
            response = tokenizer.decode(
                out[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True
            )
            try:
                scores = parse_scores(call_judge(client, user_text, response))
            except Exception as e:
                failures += 1
                print(f"[judge] {lang} #{i}: request failed: {type(e).__name__}: {e}")
                continue
            if scores is None:
                failures += 1
                print(f"[judge] {lang} #{i}: could not parse scores from judge reply")
                continue
            rows.append({
                "language": lang, "sample_id": i + 1,
                "prompt": user_text, "response": response,
                **scores, "notes": "llm_judge",
            })

    with open(out_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    print(f"\n[judge] scored {len(rows)} samples ({failures} failures) -> {out_path}")
    for lang in languages:
        vals = [r for r in rows if r["language"] == lang]
        if not vals:
            continue
        avg = "  ".join(
            f"{d}={sum(r[d] for r in vals) / len(vals):.2f}" for d in RUBRIC_DIMENSIONS
        )
        print(f"[judge] {lang:<10} n={len(vals):<4} {avg}")
    if failures:
        print(f"[judge] WARNING: {failures} sample(s) failed to score — see above.")
    return out_path


def main(config_path, checkpoint, out_path, n_samples=20, limit=0):
    cfg = load_config(config_path)
    if judge_client_config(cfg) is None:
        print("[judge] eval.run_llm_judge is false in config — nothing to do. "
              "Set it to true (and fill in the judge_* keys) to enable.")
        return None

    from unsloth import FastLanguageModel
    from data.formatting import get_formatted_tokenizer

    mcfg = cfg["model"]
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=checkpoint,
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    tokenizer = get_formatted_tokenizer(tokenizer, cfg)
    return score_rubric(model, tokenizer, cfg, out_path, n_samples, limit)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    parser.add_argument("--checkpoint", default="outputs/checkpoints/final_adapters")
    parser.add_argument("--out", default="eval/rubric_scored.csv")
    parser.add_argument("--n", type=int, default=None,
                        help="samples per language (default: config eval.judge_samples_per_language)")
    parser.add_argument("--limit", type=int, default=0,
                        help="if non-zero, score only this many per language (debug)")
    args = parser.parse_args()
    _cfg = load_config(args.config)
    n = args.n if args.n is not None else _cfg["eval"].get("judge_samples_per_language", 20)
    main(args.config, args.checkpoint, args.out, n, args.limit)
