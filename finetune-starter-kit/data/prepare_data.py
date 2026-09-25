"""
Data preparation: load raw dataset, deduplicate, and apply basic quality
filters. Run this before split_data.py.

Usage:
    python data/prepare_data.py --config config/config.yaml
"""
import argparse
import hashlib
import os
import yaml
from datasets import load_dataset, load_from_disk, Dataset


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def hash_conversation(example):
    """Content hash used for exact-duplicate removal."""
    text = str(example.get("conversations", ""))
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def dedup(dataset: Dataset) -> Dataset:
    seen = set()
    keep_idx = []
    for i, ex in enumerate(dataset):
        h = hash_conversation(ex)
        if h not in seen:
            seen.add(h)
            keep_idx.append(i)
    removed = len(dataset) - len(keep_idx)
    print(f"[dedup] removed {removed} exact-duplicate examples "
          f"({removed / max(len(dataset), 1):.1%})")
    return dataset.select(keep_idx)


def filter_empty_or_short(dataset: Dataset, min_chars: int = 3) -> Dataset:
    """Drop examples with empty turns or trivially short responses."""
    def is_valid(ex):
        convo = ex.get("conversations", [])
        if not convo:
            return False
        for turn in convo:
            val = turn.get("value", "")
            if not val or len(val.strip()) < min_chars:
                return False
        return True

    before = len(dataset)
    dataset = dataset.filter(is_valid)
    print(f"[filter] removed {before - len(dataset)} empty/too-short examples")
    return dataset


# NOTE: toxicity/PII filtering is intentionally left as a stub. Plug in a
# classifier here (e.g. a moderation model or regex/PII library) before
# using this kit on data you haven't already screened.
def filter_toxic_or_pii(dataset: Dataset) -> Dataset:
    print("[filter] toxicity/PII filter not configured — pass-through. "
          "See TODO in prepare_data.py before using on unscreened data.")
    return dataset


def main(config_path: str):
    cfg = load_config(config_path)
    name = cfg["data"]["dataset_name"]
    # A local path (e.g. output of data/build_dataset.py) vs. a Hub dataset name.
    if os.path.isdir(name):
        dataset = load_from_disk(name)
    else:
        dataset = load_dataset(name, split="train")
    print(f"[load] {len(dataset)} raw examples from {name}")

    dataset = dedup(dataset)
    dataset = filter_empty_or_short(dataset)
    dataset = filter_toxic_or_pii(dataset)

    out_path = "data/prepared"
    dataset.save_to_disk(out_path)
    print(f"[save] {len(dataset)} cleaned examples -> {out_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    args = parser.parse_args()
    main(args.config)
