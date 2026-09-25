"""
Train a LoRA fine-tune of the base model on the prepared data splits.
Config-driven — edit config/config.yaml rather than this file.

Usage:
    python train.py --config config/config.yaml
"""
import argparse
import yaml
from datasets import load_from_disk

from data.formatting import get_formatted_tokenizer, make_formatting_func


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def main(config_path: str):
    cfg = load_config(config_path)
    mcfg, lcfg, tcfg, trk = cfg["model"], cfg["lora"], cfg["training"], cfg["tracking"]

    from unsloth import FastLanguageModel
    from trl import SFTTrainer
    from transformers import TrainingArguments, EarlyStoppingCallback

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=mcfg["base_model"],
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )

    model = FastLanguageModel.get_peft_model(
        model,
        r=lcfg["r"],
        target_modules=lcfg["target_modules"],
        lora_alpha=lcfg["lora_alpha"],
        lora_dropout=lcfg["lora_dropout"],
        bias=lcfg["bias"],
        use_gradient_checkpointing=lcfg["use_gradient_checkpointing"],
        random_state=lcfg["random_state"],
        use_rslora=lcfg["use_rslora"],
    )

    tokenizer = get_formatted_tokenizer(tokenizer, cfg)
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
        learning_rate=tcfg["learning_rate"],
        logging_steps=tcfg["logging_steps"],
        eval_strategy="steps",
        eval_steps=tcfg["eval_steps"],
        save_steps=tcfg["save_steps"],
        save_total_limit=tcfg["save_total_limit"],
        optim=tcfg["optim"],
        weight_decay=tcfg["weight_decay"],
        lr_scheduler_type=tcfg["lr_scheduler_type"],
        seed=tcfg["seed"],
        report_to=trk["report_to"] if trk["report_to"] != "none" else [],
        run_name=trk["run_name"],
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
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

    trainer.train()

    model.save_pretrained(f"{tcfg['output_dir']}/final_adapters")
    tokenizer.save_pretrained(f"{tcfg['output_dir']}/final_adapters")
    print(f"[done] adapters saved to {tcfg['output_dir']}/final_adapters")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    args = parser.parse_args()
    main(args.config)
