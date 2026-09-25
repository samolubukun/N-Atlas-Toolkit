"""
Standalone inference: load a saved checkpoint and chat with it.
Kept separate from train.py so you can run inference without dragging
in the whole training setup.

Usage:
    python inference.py --checkpoint outputs/checkpoints/final_adapters --prompt "Hello!"
"""
import argparse
import yaml

from data.formatting import get_formatted_tokenizer, format_single_prompt


def load_config(path):
    with open(path) as f:
        return yaml.safe_load(f)


def main(config_path: str, checkpoint: str, prompt: str, stream: bool, system_prompt=None):
    cfg = load_config(config_path)
    mcfg = cfg["model"]

    from unsloth import FastLanguageModel

    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=checkpoint,
        max_seq_length=mcfg["max_seq_length"],
        dtype=mcfg["dtype"],
        load_in_4bit=mcfg["load_in_4bit"],
    )
    FastLanguageModel.for_inference(model)
    tokenizer = get_formatted_tokenizer(tokenizer, cfg)

    text = format_single_prompt(tokenizer, prompt, cfg=cfg, system_prompt=system_prompt)
    inputs = tokenizer(text, return_tensors="pt", add_special_tokens=False).to(model.device)

    if stream:
        from transformers import TextStreamer
        streamer = TextStreamer(tokenizer)
        model.generate(**inputs, streamer=streamer, max_new_tokens=256, use_cache=True)
    else:
        outputs = model.generate(**inputs, max_new_tokens=256, use_cache=True)
        response = tokenizer.decode(outputs[0][inputs["input_ids"].shape[1]:], skip_special_tokens=True)
        print(response)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", default="config/config.yaml")
    parser.add_argument("--checkpoint", default="outputs/checkpoints/final_adapters")
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--system", default=None,
                        help="optional system prompt, e.g. matching N-ATLaS's "
                             "'you are a large language model trained by Awarri "
                             "AI technologies...'")
    parser.add_argument("--stream", action="store_true")
    args = parser.parse_args()
    main(args.config, args.checkpoint, args.prompt, args.stream, args.system)
