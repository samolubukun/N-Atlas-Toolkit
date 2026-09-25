"""
Delta arithmetic for base-vs-fine-tuned comparisons. No torch, no model, no
network — importable from a reporting script on a laptop with nothing but
PyYAML installed.

Kept separate from compare.py on purpose: compare.py needs torch and unsloth
to run a model, but report.py only reads a JSON file. Sharing these helpers
here means both agree on what counts as an improvement without report.py
paying for the heavy import.
"""

# Metric paths where an increase is an improvement rather than a regression.
HIGHER_IS_BETTER = ("accuracy",)

# Paths that are counts, not scores — a delta is meaningless without the ratio.
COUNT_SUFFIX = (".correct", ".total", ".pending_native_review")


def flatten_numbers(obj, prefix=""):
    """Flatten nested metrics to {'a.b.c': float}. Lists and bools are skipped."""
    out = {}
    if isinstance(obj, dict):
        for key, value in obj.items():
            out.update(flatten_numbers(value, f"{prefix}.{key}" if prefix else str(key)))
    elif isinstance(obj, bool):
        return out
    elif isinstance(obj, (int, float)):
        out[prefix] = float(obj)
    return out


def compute_deltas(base, tuned):
    """path -> {base, tuned, delta} for every numeric leaf present in both."""
    base_flat = flatten_numbers(base)
    tuned_flat = flatten_numbers(tuned)
    deltas = {}
    for key in sorted(set(base_flat) | set(tuned_flat)):
        b, t = base_flat.get(key), tuned_flat.get(key)
        if b is None or t is None:
            continue
        deltas[key] = {"base": b, "tuned": t, "delta": t - b}
    return deltas


def classify(key, delta):
    """Return 'up-good' / 'down-bad' / 'flat' / 'neutral' for a delta.

    'neutral' means the number is a count, not a score, so its direction
    carries no signal.
    """
    if any(key.endswith(s) for s in COUNT_SUFFIX):
        return "neutral"
    if abs(delta) < 1e-9:
        return "flat"
    improving = delta > 0 if any(k in key for k in HIGHER_IS_BETTER) else delta < 0
    return "up-good" if improving else "down-bad"


def format_delta(key, entry):
    """Human-readable delta: percentage points for accuracy, else a decimal."""
    value = entry["delta"]
    if classify(key, value) == "neutral":
        return f"{value:+.0f}"
    if "accuracy" in key:
        return f"{value * 100:+.1f} pp"
    return f"{value:+.4f}"
