"""Runnable hosted N-ATLaS chat and streaming example.

N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies.
"""

from __future__ import annotations

import sys

import natlas

sys.stdout.reconfigure(encoding="utf-8")


def main() -> None:
    client = natlas.Client(mode="hosted", model="NCAIR1/N-ATLaS")
    response = client.chat(
        [
            natlas.system_prompt(natlas.YO),
            {"role": "user", "content": "Báwo ni o ṣe lẹ́kè ọ́pọ̀ nípa àmọ̀ ọgbọ́?"},
        ],
        max_tokens=256,
    )
    print(natlas.ATTRIBUTION)
    print(response.message.content)
    print("\nStreaming:")
    stream = client.chat(
        [{"role": "user", "content": "Give three benefits of learning Nigerian languages."}],
        stream=True,
        max_tokens=192,
    )
    for chunk in stream:
        print(chunk.message.content, end="", flush=True)
    print()


if __name__ == "__main__":
    main()
