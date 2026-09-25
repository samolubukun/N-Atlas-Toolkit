import os
import sys

from dotenv import load_dotenv
from openai import OpenAI

if sys.stdout and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

load_dotenv()

ATTRIBUTION = "N-ATLaS is an initiative of the Federal Ministry of Communications, Innovation and Digital Economy, and powered by Awarri Technologies."
base_url = (
    os.environ.get("NATLAS_BASE_URL")
    or os.environ.get("NATLAS_API_URL")
    or "https://samuelolubukun--natlas-engine-natlasapi-serve.modal.run"
).rstrip("/")
if not base_url.endswith("/v1"):
    base_url = f"{base_url}/v1"

client = OpenAI(
    base_url=base_url,
    api_key=os.environ["NATLAS_API_KEY"],
    max_retries=5,
    timeout=60.0,
)

def chat_example():
    print("🤖 Chatting with N-ATLaS via standard OpenAI SDK...")
    response = client.chat.completions.create(
        model="NCAIR1/N-ATLaS",
        messages=[
            {"role": "system", "content": "You are a friendly multilingual African assistant."},
            {"role": "user", "content": "Barka da yamma! Ka gaya mini yadda zan fara koyon fasaha."},
        ],
        temperature=0.7,
        max_tokens=300,
    )
    print("\nReply:\n" + response.choices[0].message.content)

def streaming_example():
    print("\n🌊 Streaming tokens from N-ATLaS...")
    stream = client.chat.completions.create(
        model="NCAIR1/N-ATLaS",
        messages=[
            {"role": "user", "content": "List 3 reasons why preserving African indigenous languages is vital."}
        ],
        temperature=0.6,
        max_tokens=250,
        stream=True,
    )
    for chunk in stream:
        delta = chunk.choices[0].delta.content or ""
        print(delta, end="", flush=True)
    print("\n")

if __name__ == "__main__":
    print(ATTRIBUTION)
    chat_example()
    streaming_example()
