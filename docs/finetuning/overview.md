# Fine-Tuning Overview

The N-ATLaS Fine-Tuning Starter Kit (`finetune-starter-kit/`) is a config-driven scaffold built around Unsloth and Hugging Face PEFT for LoRA and QLoRA fine-tuning of `NCAIR1/N-ATLaS`.

---

## Architecture of the Fine-Tuning Pipeline

Unlike monolithic notebooks, the pipeline is divided into independent, rerunnable stages:

```text
[Raw Custom Data] ---> [data/import_custom_data.py] (NFC Unicode normalisation)
                              |
                              v
                       [data/prepare_data.py] (Deduplication & filtering)
                              |
                              v
                       [data/split_data.py] (Stratified 4-language split)
                              |
                              v
                       [train.py / train_hf.py] (LoRA / QLoRA 4-bit)
                              |
                              v
                       [eval/compare.py] (Base vs Fine-Tuned deltas)
                              |
                              v
                       [save_export.py] (GGUF / Hugging Face Hub export)
```

---

## Licensing Terms to Note

Fine-tuning `NCAIR1/N-ATLaS` inherits the model's sovereign terms:
* **Research and Innovation Use**: Free for research and innovation. Commercial use requires licensing from Awarri Technologies.
* **1,000 Active End-User Cap**: Rolling 30-day window per organization.
* **Attribution**: Must retain the sovereign attribution to the Federal Ministry of Communications, Innovation and Digital Economy, and Awarri Technologies.
* **Derivative Naming**: Renamed model derivatives must carry the suffix **"Powered by Awarri"**.

---

## The Date-Aware Chat Template

N-ATLaS uses a custom, date-aware chat template:

```text
<|start_header_id|>system<|end_header_id|>

Cutting Knowledge Date: December 2023
Today Date: 28 Sep 2026

You are a helpful assistant.<|eot_id|>
```

The fine-tuning kit defaults to `data.use_tokenizer_template: true` in `config/config.yaml`, ensuring your training data is formatted identically to the base model's native template without drift.
