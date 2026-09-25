"""
Split the cleaned dataset into train/val/test. If a "language" column is
present and config lists specific languages, splits are stratified per
language so val/test give a per-language read (and so training can be
balanced across languages instead of dominated by whichever has the most
raw examples).

Usage:
    python data/split_data.py --config config/config.yaml
"""
import argparse
import yaml
from datasets import load_from_disk, concatenate_datasets, DatasetDict


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def split_one(dataset, val_frac, test_frac, seed):
    n = len(dataset)
    dataset = dataset.shuffle(seed=seed)
    n_test = int(n * test_frac)
    n_val = int(n * val_frac)
    test = dataset.select(range(n_test))
    val = dataset.select(range(n_test, n_test + n_val))
    train = dataset.select(range(n_test + n_val, n))
    return train, val, test


def main(config_path: str):
    cfg = load_config(config_path)
    dcfg = cfg["data"]
    dataset = load_from_disk("data/prepared")

    languages = dcfg.get("languages", ["all"])

    if languages == ["all"] or "language" not in dataset.column_names:
        train, val, test = split_one(
            dataset, dcfg["val_split"], dcfg["test_split"], dcfg["seed"]
        )
    else:
        # Stratify per language so every language shows up in val/test,
        # and none can silently dominate the training mix.
        train_parts, val_parts, test_parts = [], [], []
        for lang in languages:
            subset = dataset.filter(lambda ex: ex["language"] == lang)
            if len(subset) == 0:
                print(f"[split] WARNING: no examples found for language={lang}")
                continue
            tr, va, te = split_one(
                subset, dcfg["val_split"], dcfg["test_split"], dcfg["seed"]
            )
            train_parts.append(tr)
            val_parts.append(va)
            test_parts.append(te)
            print(f"[split] {lang}: train={len(tr)} val={len(va)} test={len(te)}")
        train = concatenate_datasets(train_parts).shuffle(seed=dcfg["seed"])
        val = concatenate_datasets(val_parts)
        test = concatenate_datasets(test_parts)

    splits = DatasetDict({"train": train, "validation": val, "test": test})
    splits.save_to_disk("data/splits")
    print(f"[save] train={len(train)} val={len(val)} test={len(test)} -> data/splits")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    args = parser.parse_args()
    main(args.config)
