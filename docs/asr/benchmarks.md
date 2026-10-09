# ASR Benchmarks & Accuracy Metrics (WER / CER)

How to run scientific evaluations of the Sovereign ASR models against standardized test sets.

---

## Metric Definitions

1. **Word Error Rate (WER)**:
   $$\text{WER} = \frac{\text{Substitutions} + \text{Deletions} + \text{Insertions}}{\text{Total Reference Words}}$$

2. **Character Error Rate (CER)**:
   $$\text{CER} = \frac{\text{Levenshtein Edit Distance}}{\text{Total Reference Characters}}$$

!!! tip "Why CER is Critical in Nigerian ASR"
    Nigerian languages rely on tonal diacritics (e.g. Yoruba `ẹ̀kọ́` vs `ẹkọ`, Hausa hooked letters `ƙ` vs `k`). A missing tone accent is an entire word penalty in WER, but only a single-character difference in CER.

---

## Running the Benchmark

The toolkit includes an automated harness streaming from [`benjaminogbonna/nigerian_common_voice_dataset`](https://huggingface.co/datasets/benjaminogbonna/nigerian_common_voice_dataset):

```bash
# Full benchmark across all 4 languages (25 samples each):
python finetune-starter-kit/eval/eval_asr.py

# Quick smoke-test (5 samples per language):
python finetune-starter-kit/eval/eval_asr.py --fast

# Benchmark a single language:
python finetune-starter-kit/eval/eval_asr.py --languages yoruba --num-samples 50
```

### Example Summary Output

```text
==============================================================================
                      ASR BENCHMARK FINAL REPORT                      
==============================================================================
Language           | Samples | Avg WER   | Avg CER   | Avg Lat  | Pass Rate
------------------------------------------------------------------------------
Hausa              | 25      |  12.4%    |   3.8%    |  0.82s   | 100.0%
Igbo               | 25      |  14.1%    |   4.2%    |  0.91s   | 100.0%
Yoruba             | 25      |  13.8%    |   4.0%    |  0.88s   | 100.0%
English (Nigerian) | 25      |   9.2%    |   2.5%    |  0.75s   | 100.0%
==============================================================================
```
