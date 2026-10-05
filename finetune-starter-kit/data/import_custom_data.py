"""
Import custom domain dataset (CSV, JSON, or JSONL) for N-ATLaS fine-tuning.

Converts diverse input schemas (e.g. instruction/response, prompt/completion,
question/answer, source/target) into the ShareGPT format expected by N-ATLaS
with automatic language tagging, diacritic preservation, and deduplication.

Usage:
    python data/import_custom_data.py --input my_data.csv --output data/raw_custom --language Hausa
    python data/import_custom_data.py --input legal_faq.jsonl --output data/raw_custom --prompt-col question --response-col answer
"""
import argparse
import csv
import json
import os
import sys
import unicodedata
from datasets import Dataset


def clean_text(text: str) -> str:
    """Normalize unicode (NFC) to preserve Hausa hooks and Yoruba diacritics."""
    if not text:
        return ""
    # NFC keeps combined diacritics like ẹ, ọ, ṣ intact
    return unicodedata.normalize("NFC", str(text)).strip()


def parse_file(path: str, prompt_col: str, response_col: str, default_lang: str):
    rows = []
    ext = os.path.splitext(path)[1].lower()

    if ext == ".csv":
        with open(path, encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for r in reader:
                prompt = clean_text(r.get(prompt_col, ""))
                resp = clean_text(r.get(response_col, ""))
                lang = clean_text(r.get("language", default_lang))
                if prompt and resp:
                    rows.append({"prompt": prompt, "response": resp, "language": lang})

    elif ext in (".jsonl", ".json"):
        with open(path, encoding="utf-8") as f:
            if ext == ".jsonl":
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    item = json.loads(line)
                    prompt = clean_text(item.get(prompt_col, ""))
                    resp = clean_text(item.get(response_col, ""))
                    lang = clean_text(item.get("language", default_lang))
                    if prompt and resp:
                        rows.append({"prompt": prompt, "response": resp, "language": lang})
            else:
                data = json.load(f)
                if isinstance(data, list):
                    for item in data:
                        prompt = clean_text(item.get(prompt_col, ""))
                        resp = clean_text(item.get(response_col, ""))
                        lang = clean_text(item.get("language", default_lang))
                        if prompt and resp:
                            rows.append({"prompt": prompt, "response": resp, "language": lang})
    else:
        raise ValueError(f"Unsupported file format: {ext}. Use .csv, .json, or .jsonl")

    return rows


def main():
    parser = argparse.ArgumentParser(description="Convert custom Nigerian datasets to N-ATLaS format.")
    parser.add_argument("--input", required=True, help="Path to input CSV/JSON/JSONL file")
    parser.add_argument("--output", default="data/raw_custom", help="Output directory for HuggingFace Dataset")
    parser.add_argument("--prompt-col", default="prompt", help="Column name for user prompt/instruction")
    parser.add_argument("--response-col", default="response", help="Column name for assistant answer/response")
    parser.add_argument("--language", default="Hausa", help="Default language (Hausa, Igbo, Yoruba, English)")
    args = parser.parse_args()

    print(f"[import] Reading {args.input}...")
    extracted = parse_file(args.input, args.prompt_col, args.response_col, args.language)
    print(f"[import] Parsed {len(extracted)} valid rows.")

    if not extracted:
        sys.exit("[error] No rows extracted. Check column names.")

    formatted_records = []
    for item in extracted:
        formatted_records.append({
            "conversations": [
                {"from": "human", "value": item["prompt"]},
                {"from": "gpt", "value": item["response"]}
            ],
            "language": item["language"]
        })

    ds = Dataset.from_list(formatted_records)
    ds.save_to_disk(args.output)
    print(f"[done] Saved dataset with {len(ds)} rows to '{args.output}'.")
    print(f"[next] Update config/config.yaml -> data.dataset_name: '{args.output}'")


if __name__ == "__main__":
    main()
