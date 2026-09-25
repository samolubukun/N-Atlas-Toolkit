"""Runnable N-ATLaS language detection demo.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import sys

import natlas

sys.stdout.reconfigure(encoding="utf-8")

SAMPLES = {
    natlas.YO: "Kí ni o ṣe? Mo fẹ́ kọ́ ìwé Yorùbá.",
    natlas.HA: "Sannu! Yaya ake amfani da AI a Najeriya?",
    natlas.IG: "Kedu otu teknụzụ nwere ike inyere aka ịmụta?",
    natlas.EN_NG: "What is artificial intelligence and how can I use it?",
}


def main() -> None:
    print(natlas.ATTRIBUTION)
    for expected, text in SAMPLES.items():
        detected = natlas.detect_language(text)
        print(f"{expected:18} -> {detected:18} | {text}")
        print(natlas.system_prompt(detected).content)


if __name__ == "__main__":
    main()
