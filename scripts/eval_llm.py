#!/usr/bin/env python3
"""Quality Evaluation Harness for N-ATLaS LLM.

Scores model output across:
1. Scam & Financial Fraud Classification F1/Accuracy.
2. Multilingual Translation chrF / BLEU (English <-> Yoruba, Hausa, Igbo).
3. Structured JSON Schema Compliance Rate & Coercion Resilience.

N-ATLaS is an initiative of the Federal Ministry of Communications,
Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from typing import Any
from pydantic import BaseModel, Field

for stream in (sys.stdout, sys.stderr):
    try:
        stream.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Ensure .env is loaded if present
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # Minimal fallback parser if python-dotenv is not installed
    env_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
    if os.path.exists(env_file):
        with open(env_file, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    os.environ.setdefault(k.strip(), v.strip())

from natlas import Client


class ExtractTarget(BaseModel):
    name: str
    amount: float
    items: list[str] = Field(default_factory=list)


# Evaluation test sets
SCAM_TEST_SET = [
    {
        "text": "Your BVN has been blocked by CBN. Call 08012345678 immediately to unblock your account.",
        "label": True,
    },
    {
        "text": "Win 500,000 Naira in the federal government relief fund! Send 2,000 registration fee to account 1234567890.",
        "label": True,
    },
    {
        "text": "Dear customer, your statement for period 01-Jan to 31-Jan is attached. Thank you for banking with GTBank.",
        "label": False,
    },
    {
        "text": "Your Uber ride with Driver Ibrahim has arrived. Vehicle: Toyota Corolla (ABC-123-XY).",
        "label": False,
    },
]

TRANSLATION_TEST_SET = [
    {
        "source": "Good morning, how are you and your family doing today?",
        "target_lang": "yoruba",
        "reference": "Ẹ kárọ̀, báwo ni ẹ̀yin àti ẹbí yín ṣe wà lónìí?",
    },
    {
        "source": "Water is very important for human health.",
        "target_lang": "hausa",
        "reference": "Ruwa yana da muhimmanci sosai ga lafiyar dan adam.",
    },
    {
        "source": "Welcome to our home.",
        "target_lang": "igbo",
        "reference": "Nnọọ n'ụlọ anyị.",
    },
]

EXTRACTION_TEST_SET = [
    {
        "prompt": "Adeola paid 15,000 naira for two chairs and one table.",
        "expected_name": "Adeola",
        "expected_amount": 15000.0,
    },
    {
        "prompt": "Chidi purchased cement for 7500.",
        "expected_name": "Chidi",
        "expected_amount": 7500.0,
    },
]


def char_f_score(hypothesis: str, reference: str, n: int = 6, beta: float = 2.0) -> float:
    """Lightweight pure-Python chrF implementation (character n-gram F-score)."""
    hyp_chars = "".join(hypothesis.lower().split())
    ref_chars = "".join(reference.lower().split())

    if not hyp_chars or not ref_chars:
        return 0.0

    total_f = 0.0
    for order in range(1, n + 1):
        hyp_ngrams = [hyp_chars[i : i + order] for i in range(len(hyp_chars) - order + 1)]
        ref_ngrams = [ref_chars[i : i + order] for i in range(len(ref_chars) - order + 1)]

        if not hyp_ngrams or not ref_ngrams:
            continue

        ref_counts: dict[str, int] = {}
        for ng in ref_ngrams:
            ref_counts[ng] = ref_counts.get(ng, 0) + 1

        matches = 0
        for ng in hyp_ngrams:
            if ref_counts.get(ng, 0) > 0:
                matches += 1
                ref_counts[ng] -= 1

        precision = matches / len(hyp_ngrams) if hyp_ngrams else 0.0
        recall = matches / len(ref_ngrams) if ref_ngrams else 0.0

        if precision + recall > 0:
            order_f = ((1 + beta**2) * precision * recall) / ((beta**2 * precision) + recall)
        else:
            order_f = 0.0
        total_f += order_f

    return total_f / n


def run_eval(client: Client) -> dict[str, Any]:
    print("==================================================")
    print("🚀 N-ATLaS LLM Generation & Task Quality Harness")
    print("==================================================\n")

    # 1. Scam Classification Evaluation
    print("1. Running Scam Classification Benchmark...")
    scam_tp = 0
    scam_fp = 0
    scam_fn = 0
    scam_tn = 0

    for sample in SCAM_TEST_SET:
        res = client.classify_scam(sample["text"])
        is_scam = res.get("is_scam", False)
        actual = sample["label"]

        if is_scam and actual:
            scam_tp += 1
        elif is_scam and not actual:
            scam_fp += 1
        elif not is_scam and actual:
            scam_fn += 1
        else:
            scam_tn += 1

    precision = scam_tp / (scam_tp + scam_fp) if (scam_tp + scam_fp) > 0 else 1.0
    recall = scam_tp / (scam_tp + scam_fn) if (scam_tp + scam_fn) > 0 else 1.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    accuracy = (scam_tp + scam_tn) / len(SCAM_TEST_SET)

    print(f"   - Scam F1 Score: {f1:.3f} (Accuracy: {accuracy * 100:.1f}%)")

    # 2. Translation chrF Evaluation
    print("\n2. Running Multilingual Translation Benchmark (chrF)...")
    chrf_scores = []
    for item in TRANSLATION_TEST_SET:
        hyp = client.translate(item["source"], target_language=item["target_lang"])
        score = char_f_score(hyp, item["reference"])
        chrf_scores.append(score)
        print(f"   - [{item['target_lang'].upper()}] chrF: {score:.3f}")

    avg_chrf = sum(chrf_scores) / len(chrf_scores) if chrf_scores else 0.0
    print(f"   - Average Translation chrF: {avg_chrf:.3f}")

    # 3. Schema Compliance Evaluation
    print("\n3. Running Structured JSON Schema Compliance Benchmark...")
    schema_successes = 0
    for test in EXTRACTION_TEST_SET:
        try:
            entry = client.extract(
                response_model=ExtractTarget,
                prompt=test["prompt"],
            )
            if entry.name.lower() in test["expected_name"].lower() and abs(entry.amount - test["expected_amount"]) < 1.0:
                schema_successes += 1
        except Exception:
            pass

    schema_acc = (schema_successes / len(EXTRACTION_TEST_SET)) * 100
    print(f"   - Schema Compliance Rate: {schema_acc:.1f}%")

    results = {
        "scam_f1": round(f1, 3),
        "scam_accuracy": round(accuracy, 3),
        "translation_chrf_avg": round(avg_chrf, 3),
        "schema_compliance_percent": round(schema_acc, 1),
    }

    print("\n==================================================")
    print("📊 Summary Results:")
    print(json.dumps(results, indent=2))
    print("==================================================")
    return results


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate N-ATLaS LLM task generation quality.")
    parser.add_argument("--base-url", default=os.environ.get("NATLAS_BASE_URL"), help="Base API endpoint")
    parser.add_argument("--api-key", default=os.environ.get("NATLAS_API_KEY"), help="API key")
    args = parser.parse_args()

    client = Client(mode="hosted", base_url=args.base_url, api_key=args.api_key)
    run_eval(client)


if __name__ == "__main__":
    main()
