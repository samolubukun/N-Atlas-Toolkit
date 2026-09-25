"""
Fallback trainer using standard Hugging Face PEFT (QLoRA) and TRL.
Use this when running on platforms where Unsloth is not supported
(e.g., native Windows without WSL2, Multi-GPU DDP, ROCm, or non-Ampere/Turing GPUs).

Usage:
    python train_hf.py --config config/config.yaml
"""
import argparse
import os
import yaml
import torch
from datasets import load_from_disk
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
    EarlyStoppingCallback,
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from trl import SFTTrainer

from data.formatting import get_formatted_tokenizer, make_formatting_func


def load_config(path: str):
    with open(path, encoding="utf-8") as f:
        return yaml.safe_load(f)


def main(config_path: str):
    cfg = load_config(config_path)
    mcfg = cfg["model"]
    lcfg = cfg["lora"]
    tcfg = cfg["training"]
    trk = cfg.get("tracking", {})

    print(f"[setup] Loading model {mcfg['base_model']} via standard HuggingFace + BitsAndBytes...")

    bnb_config = None
    if mcfg.get("load_in_4bit", True):
        compute_dtype = torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=compute_dtype,
            bnb_4bit_use_double_quant=True,
        )

    tokenizer = AutoTokenizer.from_pretrained(
        mcfg["base_model"],
        token=os.environ.get("HF_TOKEN"),
        trust_remote_code=True,
    )
    tokenizer = get_formatted_tokenizer(tokenizer, cfg)

    model = AutoModelForCausalLM.from_pretrained(
        mcfg["base_model"],
        quantization_config=bnb_config,
        device_map="auto" if torch.cuda.is_available() else None,
        torch_dtype=torch.bfloat16 if torch.cuda.is_available() and torch.cuda.is_bf16_supported() else torch.float16,
        token=os.environ.get("HF_TOKEN"),
        trust_remote_code=True,
    )

    if mcfg.get("load_in_4bit", True):
        model = prepare_model_for_kbit_training(model)

    peft_config = LoraConfig(
        r=lcfg["r"],
        lora_alpha=lcfg["lora_alpha"],
        lora_dropout=lcfg["lora_dropout"],
        bias=lcfg["bias"],
        task_type="CAUSAL_LM",
        target_modules=lcfg["target_modules"],
        use_rslora=lcfg.get("use_rslora", False),
    )
    model = get_peft_model(model, peft_config)
    model.print_trainable_parameters()

    formatting_func = make_formatting_func(tokenizer, cfg)

    splits = load_from_disk("data/splits")
    train_ds = splits["train"].map(formatting_func, batched=True)
    val_ds = splits["validation"].map(formatting_func, batched=True)

    args = TrainingArguments(
        output_dir=tcfg["output_dir"],
        per_device_train_batch_size=tcfg["per_device_train_batch_size"],
        gradient_accumulation_steps=tcfg["gradient_accumulation_steps"],
        warmup_steps=tcfg["warmup_steps"],
        num_train_epochs=tcfg["num_train_epochs"] if tcfg["max_steps"] is None else 1,
        max_steps=tcfg["max_steps"] if tcfg["max_steps"] else -1,
        learning_rate=float(tcfg["learning_rate"]),
        logging_steps=tcfg["logging_steps"],
        eval_strategy="steps",
        eval_steps=tcfg["eval_steps"],
        save_steps=tcfg["save_steps"],
        save_total_limit=tcfg["save_total_limit"],
        optim=tcfg["optim"],
        weight_decay=tcfg["weight_decay"],
        lr_scheduler_type=tcfg["lr_scheduler_type"],
        seed=tcfg["seed"],
        report_to=trk.get("report_to", "none") if trk.get("report_to") != "none" else [],
        run_name=trk.get("run_name", "llama3-8b-finetune"),
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        fp16=not (torch.cuda.is_available() and torch.cuda.is_bf16_supported()),
        bf16=torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
    )

    callbacks = []
    if tcfg.get("early_stopping_patience"):
        callbacks.append(EarlyStoppingCallback(early_stopping_patience=tcfg["early_stopping_patience"]))

    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=train_ds,
        eval_dataset=val_ds,
        dataset_text_field="text",
        max_seq_length=mcfg["max_seq_length"],
        args=args,
        callbacks=callbacks,
    )

    print("[train] Starting LoRA fine-tuning...")
    trainer.train()

    final_dir = os.path.join(tcfg["output_dir"], "final_adapters")
    model.save_pretrained(final_dir)
    tokenizer.save_pretrained(final_dir)
    print(f"[done] Adapters saved to {final_dir}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Hugging Face SFTTrainer for N-ATLaS")
    parser.add_argument("--config", default="config/config.yaml")
    args = parser.parse_args()
    main(args.config)
