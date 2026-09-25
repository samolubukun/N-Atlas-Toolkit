"""
External benchmark support: load a public multiple-choice benchmark, score it
by exact-match on the chosen option letter, and return accuracy per language.

Why multiple-choice: N-ATLaS is evaluated with a human rubric (fluency,
coherence, relevance, accuracy, bias, usefulness), which needs a human or an
LLM judge and is not reproducible for free. MCQ benchmarks like Belebele are
scored by string comparison, so they cost nothing to run, are deterministic at
temperature 0, and give a real before/after number for a fine-tune.

Everything here degrades gracefully. A benchmark that cannot be downloaded,
is not available for a language, or returns an unexpected schema is reported
as a skip with a reason instead of raising — one missing dataset must not
abort a whole comparison run.

Schema handling is deliberately forgiving: Belebele has shipped under a few
field names, and a rename should not break the harness.
"""
import re

LETTERS = ["A", "B", "C", "D", "E", "F"]

# Field-name variants seen across Belebele revisions.
# Belebele stores its options as separate numbered columns (mc_answer1..4)
# rather than a list, and its gold label as a 1-based string
# (correct_answer_num), so both shapes are handled below.
_CONTEXT_KEYS = ("flores_passage", "context", "passage", "text_context")
_QUESTION_KEYS = ("prompt", "question", "text", "input")
_CHOICE_KEYS = ("choices", "options", "labels", "candidates")
_ANSWER_KEYS = ("answer", "label", "gold", "target",
                "correct_answer_num", "answer_index")
_CHOICE_PREFIXES = ("mc_answer", "answer", "choice", "option")

# "The answer is B", "B.", "2)" -> a single chosen option
_ANSWER_PATTERNS = (
    r"answer\s*(?:is|:)?\s*\**\s*\(?([A-F])\)?\b",
    r"^\s*\**\(?([A-F])\)?\**\s*[\.\):\-]",
    r"^\s*\**\(?([A-F])\)?\**\s*$",
    r"\b(?:option|choice)\s*\(?([A-F])\)?\b",
    r"^\s*\(?([1-6])\)?\s*[\.\):\-]",
    r"\b([A-F])\b",
)


def build_mcq_prompt(question, choices, context=None):
    """Render a question and lettered options. The model is asked for one
    letter so the response can be matched without a judge.

    Belebele is reading comprehension, so the passage has to be included —
    a bare question with no passage is unanswerable and would score the model
    on its ability to guess.
    """
    lines = []
    if context:
        lines += [f"Passage: {context}", ""]
    lines += [f"Question: {question}", "", "Options:"]
    for letter, choice in zip(LETTERS, choices):
        lines.append(f"{letter}. {choice}")
    lines += ["", "Answer with a single letter and nothing else.", "Answer:"]
    return "\n".join(lines)


def parse_choice(raw, num_choices):
    """Extract the chosen option index from a model completion.

    Returns an int index, or None when nothing parses. Never raises: an
    unparseable response is a wrong answer, not an error.
    """
    if raw is None:
        return None
    text = raw.strip()
    for pattern in _ANSWER_PATTERNS:
        m = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
        if not m:
            continue
        token = m.group(1).upper()
        if token.isdigit():
            idx = int(token) - 1
        else:
            idx = LETTERS.index(token) if token in LETTERS else None
        if idx is not None and 0 <= idx < num_choices:
            return idx
    return None


def _normalise_answer(answer, num_choices):
    """Coerce a gold answer to an int index, accepting ints or letter/1-based
    strings depending on how the dataset encodes it."""
    if isinstance(answer, bool):
        return None
    if isinstance(answer, int):
        return answer if 0 <= answer < num_choices else None
    text = str(answer).strip()
    if text.isdigit():
        # Text digits are 1-based by convention ("option 3"). Ints arrive as
        # ints and are already 0-based, so they never reach this branch.
        n = int(text)
        if 1 <= n <= num_choices:
            return n - 1
        if 0 <= n < num_choices:
            return n
        return None
    upper = text.upper()
    if len(upper) == 1 and upper in LETTERS:
        idx = LETTERS.index(upper)
        return idx if idx < num_choices else None
    return None


def _extract(row, keys):
    for key in keys:
        if key in row and row[key] not in (None, ""):
            return row[key]
    return None


def _extract_choices(row):
    """Options as a list, whether stored as a list column or as separate
    numbered columns (Belebele's mc_answer1..4)."""
    for key in _CHOICE_KEYS:
        value = row.get(key)
        if isinstance(value, (list, tuple)) and len(value) >= 2:
            return list(value)
        if isinstance(value, str) and value.strip():
            return [value]
    for prefix in _CHOICE_PREFIXES:
        numbered = []
        i = 1
        while f"{prefix}{i}" in row:
            value = row[f"{prefix}{i}"]
            if value not in (None, ""):
                numbered.append(value)
            i += 1
        if len(numbered) >= 2:
            return numbered
    return None


def load_benchmark(name, language, split="test", limit=0, cache_dir=None):
    """Load one language slice of a HF multiple-choice benchmark.

    Returns (rows, note). rows is a list of dicts with
    question/choices/answer and, when the dataset supplies one, context.
    note is a short human-readable status, and ``note`` starting with "skipped"
    means the caller should not score it.
    """
    from datasets import load_dataset

    try:
        ds = load_dataset(name, language, split=split, cache_dir=cache_dir)
    except Exception as exc:
        return [], f"skipped {name}/{language}: {type(exc).__name__}: {exc}"

    rows = []
    for raw in ds:
        question = _extract(raw, _QUESTION_KEYS)
        choices = _extract_choices(raw)
        answer = _extract(raw, _ANSWER_KEYS)
        if question is None or not choices:
            continue
        idx = _normalise_answer(answer, len(choices))
        if idx is None:
            continue
        row = {
            "question": str(question).strip(),
            "choices": [str(c) for c in choices],
            "answer": idx,
        }
        context = _extract(raw, _CONTEXT_KEYS)
        if context:
            row["context"] = str(context).strip()
        rows.append(row)
        if limit and len(rows) >= limit:
            break

    if not rows:
        return [], (f"skipped {name}/{language}: no usable rows (unexpected "
                    f"schema or unanswerable gold labels)")
    with_context = sum(1 for r in rows if r.get("context"))
    note = f"{name}/{language}/{split}: {len(rows)} questions"
    if with_context:
        note += f" ({with_context} with passage)"
    return rows, note


def score_benchmark(model, tokenizer, rows, cfg=None, max_new_tokens=8):
    """Score MCQ rows and return {accuracy, correct, total, details}.

    Generation is greedy (do_sample=False) so repeated runs of the same model
    give the same number, which is what makes a before/after delta meaningful.
    """
    from data.formatting import format_single_prompt

    details = []
    correct = 0
    for i, row in enumerate(rows):
        text = format_single_prompt(
            tokenizer, build_mcq_prompt(row["question"], row["choices"],
                                        row.get("context")), cfg=cfg)
        inputs = tokenizer(text, return_tensors="pt",
                           add_special_tokens=False).to(model.device)
        out = model.generate(**inputs, max_new_tokens=max_new_tokens,
                             do_sample=False, use_cache=True)
        raw = tokenizer.decode(out[0][inputs["input_ids"].shape[1]:],
                               skip_special_tokens=True)
        picked = parse_choice(raw, len(row["choices"]))
        hit = picked == row["answer"]
        correct += int(hit)
        details.append({
            "index": i,
            "gold": LETTERS[row["answer"]],
            "picked": LETTERS[picked] if picked is not None else None,
            "correct": hit,
            "raw": raw[:200],
        })

    total = len(rows)
    return {
        "accuracy": correct / total if total else 0.0,
        "correct": correct,
        "total": total,
        "details": details,
    }
