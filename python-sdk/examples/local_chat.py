"""Runnable local N-ATLaS chat example.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import os
import sys

import natlas

sys.stdout.reconfigure(encoding="utf-8")


def main() -> None:
    client = natlas.Client(
        mode="local",
        hf_token=os.getenv("HF_TOKEN"),
        model="NCAIR1/N-ATLaS",
    )
    question = "Bawo ni a ṣe lẹ́kè ọ́pọ̀ nípa àmọ̀ ọgbọ́?"
    language = natlas.detect_language(question)
    response = client.chat(
        [
            natlas.system_prompt(language),
            {"role": "user", "content": question},
        ],
        max_tokens=256,
        temperature=0.1,
    )
    print(natlas.ATTRIBUTION)
    assert not hasattr(response, "__next__")
    print(response.message.content)


if __name__ == "__main__":
    main()
