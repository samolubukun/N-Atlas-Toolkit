# Evaluation & Comparison Harness

How to test whether your fine-tuned model actually improved or regressed in Hausa, Igbo, Yoruba, and English compared to the base model.

---

## The Comparison Workflow (`eval/compare.py`)

`eval/compare.py` runs the base model and the fine-tuned adapter side-by-side on identical prompts using greedy decoding (`temperature=0`):

```bash
# Compare base model vs trained LoRA adapter:
python finetune-starter-kit/eval/compare.py --adapter finetune-starter-kit/outputs/checkpoints/final_adapters

# Generate human-readable comparison table:
python finetune-starter-kit/eval/report.py --compare finetune-starter-kit/eval/comparison.json
```

### Example Comparison Report

```text
metric                                        base      tuned      delta
------------------------------------------------------------------------
by_language.Hausa.perplexity               4.8120     4.3910   -0.4210  (improved)
by_language.Hausa.loss                     1.5712     1.4790   -0.0922  (improved)
benchmarks.by_language.Hausa.accuracy       0.2400     0.3100    +7.0 pp (improved)
custom_testset.by_language.Yoruba.accuracy  0.2000     0.4000   +20.0 pp (improved)
by_language.English.loss                   1.3200     1.3210   +0.0010  (stable)
```

---

## What It Evaluates

1. **Perplexity and Loss per Language**: Measures how well the model predicts held-out test tokens in each language.
2. **Belebele Benchmark Accuracy**: Scored by exact-match multiple choice letters (A, B, C, D) across Hausa, Igbo, and Yoruba reading comprehension passages.
3. **Custom Hand-Written QA Testset (`custom_qa.jsonl`)**: Tests factual Nigerian knowledge and cultural queries with deterministic keyword matching.
4. **Bias Probes (`eval/bias_probes.py`)**: Evaluates paired prompts testing demographic balance and neutrality.
5. **LLM-as-a-Judge Rubric (`eval/llm_judge.py`)**: Evaluates Fluency, Coherence, Relevance, Accuracy, Bias, and Usefulness using any OpenAI-compatible judge model.
