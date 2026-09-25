"""
Export a trained checkpoint: merge to 16bit/4bit, convert to GGUF, and/or
push to the Hugging Face Hub. All controlled from config/config.yaml
under the `export:` section — set HF_TOKEN as an environment variable
before running if push_to_hub is true.

Usage:
    export HF_TOKEN=hf_xxx   # only needed if export.push_to_hub is true
    python save_export.py --checkpoint outputs/checkpoints/final_adapters
"""
import argparse
import os
import yaml


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def main(config_path: str, checkpoint: str):
    cfg = load_config(config_path)
    mcfg, xcfg = cfg["model"], cfg["export"]
    token = os.environ.get("HF_TOKEN")

    if xcfg.get("push_to_hub") and not token:
        raise SystemExit(
            "export.push_to_hub is true in config but no HF_TOKEN env var "
            "is set. Run: export HF_TOKEN=hf_xxx"
        )

    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=checkpoint,
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )

    if xcfg.get("save_lora_adapters"):
        model.save_pretrained("outputs/export/lora_adapters")
        tokenizer.save_pretrained("outputs/export/lora_adapters")
        print("[export] LoRA adapters -> outputs/export/lora_adapters")
        if xcfg.get("push_to_hub"):
            model.push_to_hub(xcfg["hub_repo_id"], token=token)
            tokenizer.push_to_hub(xcfg["hub_repo_id"], token=token)
            print(f"[export] pushed adapters -> {xcfg['hub_repo_id']}")

    if xcfg.get("merge_16bit"):
        model.save_pretrained_merged("outputs/export/merged_16bit", tokenizer, save_method="merged_16bit")
        print("[export] merged 16bit -> outputs/export/merged_16bit")
        if xcfg.get("push_to_hub"):
            model.push_to_hub_merged(xcfg["hub_repo_id"] + "-16bit", tokenizer, save_method="merged_16bit", token=token)

    if xcfg.get("merge_4bit"):
        model.save_pretrained_merged("outputs/export/merged_4bit", tokenizer, save_method="merged_4bit")
        print("[export] merged 4bit -> outputs/export/merged_4bit")
        if xcfg.get("push_to_hub"):
            model.push_to_hub_merged(xcfg["hub_repo_id"] + "-4bit", tokenizer, save_method="merged_4bit", token=token)

    for quant in xcfg.get("gguf_quant_methods", []):
        model.save_pretrained_gguf("outputs/export/gguf", tokenizer, quantization_method=quant)
        print(f"[export] GGUF ({quant}) -> outputs/export/gguf")
        if xcfg.get("push_to_hub"):
            model.push_to_hub_gguf(xcfg["hub_repo_id"] + "-gguf", tokenizer, quantization_method=quant, token=token)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    parser.add_argument("--checkpoint", default="outputs/checkpoints/final_adapters")
    args = parser.parse_args()
    main(args.config, args.checkpoint)
