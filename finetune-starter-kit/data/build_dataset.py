"""
Build a training-ready dataset for English/Hausa/Igbo/Yoruba from Cohere's
Aya Dataset (CohereForAI/aya_dataset) — 204k human-annotated instruction
pairs across 65 languages, Apache-2.0, explicitly including all four
languages N-ATLaS targets (language codes: eng, hau, ibo, yor).

This filters to those four languages and converts Aya's
inputs/targets/language_code schema into the "conversations" +
"language" format the rest of this kit expects.

Run this BEFORE data/prepare_data.py, and point config.yaml's
data.dataset_name at the output path ("data/raw_aya_4lang") once done.

Usage:
    python data/build_dataset.py
"""
from datasets import load_dataset, Dataset

# Aya's language_code -> the language names used elsewhere in this kit
# (config.yaml, split_data.py per-language stratification, eval reports).
TARGET_LANGUAGES = {
    "eng": "English",
    "hau": "Hausa",
    "ibo": "Igbo",
    "yor": "Yoruba",
}


def to_conversations(example):
    return {
        "conversations": [
            {"from": "human", "value": example["inputs"]},
            {"from": "gpt", "value": example["targets"]},
        ],
        "language": TARGET_LANGUAGES[example["language_code"]],
    }


def main():
    print("[build_dataset] loading CohereForAI/aya_dataset (this is a "
          "sizeable download, ~200k rows across 65 languages)...")
    ds = load_dataset("CohereForAI/aya_dataset", split="train")

    before = len(ds)
    ds = ds.filter(lambda ex: ex["language_code"] in TARGET_LANGUAGES)
    print(f"[build_dataset] kept {len(ds)}/{before} rows for "
          f"{list(TARGET_LANGUAGES.values())}")

    # Report the per-language counts up front — Aya's language balance
    # won't match N-ATLaS's own (English/Hausa/Igbo/Yoruba ~318k/200k/
    # 200k/200k), so check this before assuming it's balanced.
    for code, name in TARGET_LANGUAGES.items():
        n = len(ds.filter(lambda ex: ex["language_code"] == code))
        print(f"  {name:<10} {n}")

    ds = ds.map(to_conversations, remove_columns=ds.column_names)
    ds.save_to_disk("data/raw_aya_4lang")
    print("[build_dataset] saved -> data/raw_aya_4lang "
          "(point config.yaml data.dataset_name here, or load_from_disk "
          "it directly in prepare_data.py)")


if __name__ == "__main__":
    main()
