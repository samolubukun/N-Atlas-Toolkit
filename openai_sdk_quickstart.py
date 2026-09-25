import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# Point OpenAI Python SDK directly to your deployed Modal endpoint!
client = OpenAI(
    base_url=os.environ.get("NATLAS_API_URL", "https://samuelolubukun--natlas-engine-natlasllmengine-serve.modal.run") + "/v1",
    api_key=os.environ.get("NATLAS_API_KEY", "natlas-super-secret-key-2026"),
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
    chat_example()
    streaming_example()
