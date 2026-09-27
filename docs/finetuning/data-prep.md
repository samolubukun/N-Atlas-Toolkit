# Dataset Preparation Tools

Tools for formatting, cleaning, validating, and splitting multilingual datasets in Yoruba, Hausa, Igbo, and English.

---

## 1. Importing Custom Data (`data/import_custom_data.py`)

Convert raw CSV, JSON, or JSONL files into the standard ShareGPT training format:

```bash
python finetune-starter-kit/data/import_custom_data.py \
    --input my_dataset.csv \
    --output finetune-starter-kit/data/raw_mine \
    --prompt-col question \
    --response-col answer \
    --language Hausa
```

### Automatic Unicode NFC Normalisation
Nigerian diacritics (such as Yoruba `ẹ̀`, `ọ́`, Hausa `ƙ`, `ɗ`, and Igbo `ị`, `ụ`) are automatically normalised to Unicode NFC form so combined accents do not break tokenization.

---

## 2. Deduplication and Cleaning (`data/prepare_data.py`)

Cleans the raw dataset by:
* Stripping duplicate prompts and empty responses.
* Enforcing min/max token length boundaries.
* Normalising whitespace and punctuation.

```bash
python finetune-starter-kit/data/prepare_data.py --config finetune-starter-kit/config/config.yaml
```

---

## 3. Stratified Splitting (`data/split_data.py`)

Splits data into `train`, `validation`, and `test` splits while maintaining balanced proportions across Hausa, Igbo, Yoruba, and English:

```bash
python finetune-starter-kit/data/split_data.py --config finetune-starter-kit/config/config.yaml
```

Outputs:
* `data/processed/train.jsonl`
* `data/processed/val.jsonl`
* `data/processed/test.jsonl`
