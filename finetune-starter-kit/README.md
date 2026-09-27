# Fine-tuning Starter Kit

A config-driven scaffold built around Unsloth's Llama-3 8B LoRA fine-tuning
notebook, split into separate, rerunnable scripts for data prep, training,
evaluation, inference, and export. It defaults to extending
[`NCAIR1/N-ATLaS`](https://huggingface.co/NCAIR1/N-ATLaS), but every model
and dataset choice lives in `config/config.yaml`.

## Why scripts instead of one notebook

Each stage below can be rerun on its own — e.g. rerun `eval/run_eval.py`
against a new checkpoint without retraining, or fix a filter in
`data/prepare_data.py` and rerun prep without touching the model.
`notebooks/quickstart.ipynb` is a thin Colab-friendly wrapper that just
calls these scripts in order, for anyone who wants the one-click version.

## Setup

```bash
pip install -r requirements.txt
export HF_TOKEN=hf_xxx   # required: NCAIR1/N-ATLaS is a gated repo
```

The default `base_model` is **`NCAIR1/N-ATLaS`** — the fine-tuned
Hausa/Igbo/Yoruba + English model from Awarri Technologies / NCAIR / NITDA.
The kit is set up to *extend* that model. You must have been granted access
on the model page, and `HF_TOKEN` (or `huggingface-cli login`) must be set.

### Licensing — read this before you fine-tune

N-ATLaS is **not** Apache-2.0 or MIT. Its "Terms of Use for N-ATLaS" impose
conditions that a fine-tune inherits:

- **Non-commercial only.** Commercial or large-scale enterprise use needs a
  separate licensing agreement.
- **1000 active end-user cap** per organisation (rolling 30-day window).
- **Mandatory attribution:** "N-ATLaS is an initiative of the Federal
  Ministry of Communications, Innovation and Digital Economy, and powered by
  Awarri Technologies."
- **Renamed derivatives must carry the suffix "Powered by Awarri"**, and
  derivatives must be released under the same terms.

To train a comparable model from scratch with no N-ATLaS terms attached,
switch `model.base_model` to `meta-llama/Meta-Llama-3-8B` (the original
base model) or `unsloth/llama-3-8b-bnb-4bit` (ungated mirror), and set
`data.use_tokenizer_template: false`. Both paths are supported and tested.

### The chat template matters here

N-ATLaS's tokenizer ships a **custom, date-aware** chat template: it renders
`Cutting Knowledge Date` and `Today Date` into the system block and takes a
`date_string` argument. That is not the stock Llama-3 template.

The kit therefore defaults to `data.use_tokenizer_template: true`, which
keeps the base model's own template untouched and converts this kit's
ShareGPT `conversations` into the `role`/`content` form that template
expects. It never re-derives the template, so it cannot drift from what
N-ATLaS was published with.

`data.date_string` is **pinned** (default `"11 Jun 2025"`) so runs are
reproducible; set it to `null` to use today's date, frozen per process.

`data.inject_system_prompt` defaults to `null` = auto: the system prompt is
added during training exactly when the loaded template is date-aware,
because those templates render the date *inside* the system turn. Training
without it would mean the model never sees the date that eval and inference
supply. Set it explicitly to `true`/`false` to override.

Install into a virtualenv. `trl` and `transformers` are hard-pinned because
Unsloth and TRL both reach into each other's internals; see the comments in
`requirements.txt` before upgrading either.

## Confirm the dataset works before training

```bash
python scripts/smoke_test.py
```

This streams a bounded sample of Aya (see `SAMPLE_ROWS` in the script),
filters it to the 4 languages, converts the format, runs dedup/filtering,
and does a trial split — all without touching a GPU or loading the model —
and prints per-language row counts plus a sample record so you can eyeball
that Hausa/Igbo/Yoruba text and diacritics look right. It downloads almost
nothing (the full corpus is ~131MB; the sample streams a few row groups).
Fix anything it flags before running the real pipeline below.

## Pipeline

**Step 1: bring your own data** (the whole point of this kit)

```bash
# Convert a CSV, JSON, or JSONL file into the training format:
python data/import_custom_data.py \
    --input my_data.csv \
    --output data/raw_mine \
    --language Hausa          # default language if no "language" column
# Then in config/config.yaml: set data.dataset_name: "data/raw_mine"
```

The importer accepts `--prompt-col` and `--response-col` to match your column names, and handles Unicode NFC normalisation so Yoruba and Hausa diacritics survive.

**Full pipeline once data is ready:**

```bash
python data/prepare_data.py --config config/config.yaml   # dedup + filter
python data/split_data.py --config config/config.yaml     # train/val/test per language
python train.py --config config/config.yaml               # LoRA fine-tune (Unsloth)
# (Fallback for Windows/ROCm/non-Unsloth: python train_hf.py --config config/config.yaml)
python eval/compare.py --adapter outputs/checkpoints/final_adapters   # base vs fine-tuned
python eval/report.py --compare eval/comparison.json      # before/after table
python inference.py --checkpoint outputs/checkpoints/final_adapters --prompt "Sannu!"
python save_export.py --checkpoint outputs/checkpoints/final_adapters
```

> **Colab Quickstart**: If you are training on Google Colab (free T4 GPU), open and run [`notebooks/quickstart.ipynb`](notebooks/quickstart.ipynb).


`eval/compare.py` is the main entry point for evaluation — see
[Base vs fine-tuned: the worked example](#base-vs-fine-tuned-the-worked-example).
To score a single checkpoint without the comparison, use
`python eval/run_eval.py --config config/config.yaml --checkpoint <path>`
and then `python eval/report.py`.

Rubric scoring is opt-in — run `eval/llm_judge.py` on its own if you want
it separate from `run_eval.py`:

```bash
export OPENAI_API_KEY=sk-...
python eval/llm_judge.py --checkpoint outputs/checkpoints/final_adapters --n 20
```

All settings — base model, LoRA rank, batch size, dataset, languages,
tracking backend, export targets — live in `config/config.yaml`. Edit
that file rather than the scripts for routine changes.

## Optional example dataset: Aya (pipeline validation only)

If you don't have your own data yet and want to validate that the pipeline runs end-to-end before using it with real data, `data/build_dataset.py` downloads [`CohereForAI/aya_dataset`](https://huggingface.co/datasets/CohereForAI/aya_dataset) — 204k human-annotated instruction pairs, Apache-2.0 licensed — and filters it to English, Hausa, Igbo, and Yoruba.

```bash
python scripts/smoke_test.py          # fastest check — no GPU, no full download
python data/build_dataset.py         # full download (~131MB) if smoke test passes
# then in config.yaml: data.dataset_name: "data/raw_aya_4lang"
```

> [!NOTE]
> **Aya is not the goal.** The eval perplexity score you get after training on Aya
> only tells you whether the model learned Aya's style — it says nothing about
> whether it handles your actual use case (healthcare Q&A, legal text, customer
> support in Yoruba, etc.). Use it to confirm the plumbing works, then swap in
> your own data and re-run.


## Base vs fine-tuned: the worked example

`eval/compare.py` scores the base model and your fine-tuned model in the same
run and prints the difference. This is the thing that answers "did my LoRA
actually help?" — `eval/run_eval.py` only scores one checkpoint, which on its
own tells you very little.

```bash
python eval/compare.py --adapter outputs/checkpoints/final_adapters
python eval/report.py --compare eval/comparison.json
```

Use `--tuned outputs/export/merged_16bit` instead of `--adapter` if you want
to compare against a merged model rather than the base-plus-adapter.

Output looks like this (illustrative numbers, not a real run — this kit has
not been trained on a GPU yet):

```
metric                                        base      tuned      delta
----------------------------------------------------------------------
by_language.Hausa.perplexity               4.8120     4.3910   -0.4210
by_language.Hausa.loss                     1.5712     1.4790   -0.0922
benchmarks.by_language.Hausa.accuracy       0.2400     0.3100    +7.0 pp
custom_testset.by_language.Yoruba.accuracy  0.2000     0.4000   +20.0 pp
```

Negative perplexity delta is good; positive accuracy delta is good. The
report marks regressions explicitly, so a fine-tune that improves Hausa while
breaking English is immediately visible.

### What it measures

| Metric | What it tells you | Cost |
|---|---|---|
| **Perplexity / loss**, overall + per language | Did the model get better at this text distribution? A proxy, not a quality score. | free |
| **Belebele accuracy** per language | Reading-comprehension ability, on a published benchmark. Scored by exact letter match, so it is deterministic and needs no API key. | free |
| **Your own QA set** per language | Whether the model can do *your* thing. Scored by keyword match, no judge. | free |
| **Bias probes** | Paired prompts that swap one identity term. | free |
| **LLM rubric** (opt-in) | Fluency/coherence/relevance/accuracy/bias/usefulness, the six N-ATLaS used. | API key |

English is included as a **control**. A LoRA trained on Hausa/Igbo/Yoruba that
wrecks English is a real failure mode, and you only catch it if you measured
it.

### Making the comparison fair

- **Generation is greedy** (`do_sample=False`) for every accuracy metric, so
  re-running the same model gives the same number. Without that, a delta
  smaller than the sampling noise is meaningless.
- **The base model is loaded once** and the adapter attached in place, so the
  `--adapter` path does not pay for two 8B loads.
- **Both models see identical prompts.** Formatting comes from
  `data/formatting.py` for both, so a delta reflects the weights and not a
  template difference.

### Customising it

Benchmark language slices live in `config.eval.compare.benchmark_configs`.
Belebele has no English slice, which is fine — English is covered by
perplexity and the custom set. Point `benchmark_name` at any HF
multiple-choice dataset with 4 options; a slice that fails to download is
reported as a skip with a reason and the run continues.

Your own questions live in `eval/testset/custom_qa.jsonl` — one JSON object
per line:

```json
{"id": "hau_01", "language": "Hausa", "prompt": "...", "accepted": ["7", "7 kW"], "needs_native_review": true}
```

> **Testset design:** Questions use objectively correct, language-independent
> answers (capital of Nigeria = Abuja, days in a week = 7, simple arithmetic)
> so a prompt-wording error is unlikely to flip the expected answer. Items
> marked `needs_native_review: false` have been verified. One item (`hau_05`)
> involves idiomatic phrasing — have a native Hausa speaker confirm it, or
> replace it with a question you're confident in.

The same caveat applies to `config.eval.language_probe_prompts`, which the bias
probes use.

### Interpreting results

- **Perplexity down, accuracy flat** means the LoRA learned the style of your
  data but not new ability. Common and not a failure.
- **Custom set up, Belebele down** means the fine-tune overfitted to your
  test set. Both numbers are in the table for exactly this reason.
- **Aya is a few thousand rows; N-ATLaS was trained on ~918k.** Expect tone
  and formatting to shift, not new linguistic competence. This kit
  demonstrates the *workflow* for adapting the model to your data, not
  reproducing N-ATLaS's training scale.
- Always read `eval/results.json` / `eval/comparison.json` completions
  directly. Any single aggregate number can hide a bad failure mode.

## What's evaluated automatically, and what isn't

- **Perplexity / loss** on a held-out test split (overall and, if a
  `language` column exists, per language) — automatic, no extra setup.
- **Bias probes** (`eval/bias_probes.py`) — paired prompts that swap a
  single identity term, plus one per-language capability pair per language
  listed in `config.eval.language_probe_prompts`. Large differences in
  output length are a cheap first pass. This is a starting point, not a
  substitute for native-speaker or domain-expert review — extend
  `BASE_PROBE_PAIRS` and the language prompts with cases relevant to your
  deployment.
- **Rubric scoring** (fluency / coherence / relevance / accuracy / bias /
  usefulness — the same six categories used in N-ATLaS's own published
  human eval) is available two ways:
  - **LLM judge** — set `eval.run_llm_judge: true` and fill in the
    `judge_*` keys. `eval/llm_judge.py` generates responses from your
    checkpoint, scores them against any OpenAI-compatible endpoint (OpenAI,
    Groq, Together, OpenRouter, local vLLM/Ollama), and writes
    `eval/rubric_scored.csv` in the same schema as the manual template.
    `eval/report.py` picks that file up automatically.
    A judge is a **proxy for human annotators, not a replacement**: judge
    scores skew generous and compressed. Use them to compare your own runs
    against each other, not to claim parity with N-ATLaS's human numbers.
  - **Human review** — fill in `eval/rubric_template.csv` and pass it with
    `--rubric eval/rubric_filled.csv`.

## Sovereign ASR Evaluation & Benchmark (`eval/eval_asr.py`)

Automated evaluation of sovereign speech recognition across Hausa, Igbo, Yoruba, and Nigerian English using [`benjaminogbonna/nigerian_common_voice_dataset`](https://huggingface.co/datasets/benjaminogbonna/nigerian_common_voice_dataset):

```bash
# Standard benchmark (25 streamed samples per language = 100 total):
python eval/eval_asr.py

# Rapid CI/smoke test (5 samples per language):
python eval/eval_asr.py --fast

# Benchmark specific languages or sample size:
python eval/eval_asr.py --languages hausa yoruba --num-samples 50 --output asr_report.json
```

Measures:
* **WER (Word Error Rate)**
* **CER (Character Error Rate)** — key for tonal markings & diacritics (`ẹ`, `ọ`, `ƙ`, `ɗ`)
* **Inference Latency & Duration Statistics**

## Known gaps / TODOs

- `data/prepare_data.py::filter_toxic_or_pii` is a stub — plug in a
  moderation classifier or PII scrubber before training on unscreened
  data.
- No automatic sentiment/toxicity scoring on bias-probe outputs — read
  the completions in `eval/results.json` directly.
- No hyperparameter sweep support — run `train.py` multiple times with
  different configs if you need one.

