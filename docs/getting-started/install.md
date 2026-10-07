# Getting Started: Installation & First Inference

Get started with N-ATLaS in your environment in minutes.

!!! tip "Source Code & GitHub Repository"
    Both SDKs (`python-sdk` and `js-sdk`), deployment configs, and fine-tuning kits are hosted on GitHub:
    **[github.com/samolubukun/N-Atlas-Toolkit](https://github.com/samolubukun/N-Atlas-Toolkit)**

    ```bash
    git clone https://github.com/samolubukun/N-Atlas-Toolkit.git
    cd N-Atlas-Toolkit
    ```

---

## 1. Environment Setup & API Keys

Set your API key and endpoint URLs:

```bash
# Set in terminal or your project's .env file:
export NATLAS_API_KEY="your-api-key"
export NATLAS_BASE_URL="https://<workspace>--natlas-engine-natlasapi-serve.modal.run"
export NATLAS_API_URL="https://<workspace>--natlas-engine-natlasasrengine-serve.modal.run"
```

---

## 2. Python SDK Installation

=== "Hosted (Cloud Inference)"
    ```bash
    # Install directly from the repository
    pip install ./python-sdk
    ```

=== "Local Inference (In-Process PyTorch/GPU)"
    ```bash
    # Installs optional local model execution dependencies
    pip install "./python-sdk[local]"
    ```

### Your First Python Chat

```python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.YO),
    {"role": "user", "content": "Bawo ni nkan? Ṣe alaye lori AI ni ṣoki."}
])

print(response.message.content)
```

---

## 3. JavaScript / TypeScript SDK Installation

Install directly from the repository in your Node.js, Bun, Next.js, or web application:

=== "npm"
    ```bash
    npm install ./js-sdk
    ```
=== "pnpm"
    ```bash
    pnpm add ./js-sdk
    ```
=== "bun"
    ```bash
    bun add ./js-sdk
    ```

### Your First TypeScript Chat

```typescript
import { NatlasClient, systemPrompt, YO } from "natlas";

const client = new NatlasClient({
  apiKey: process.env.NATLAS_API_KEY,
});

async function main() {
  const response = await client.chat([
    systemPrompt(YO),
    { role: "user", content: "Sannu! Ka ba ni misali na amfanin AI." }
  ]);

  console.log(response.message.content);
}

main();
```

---

## 4. Drop-In OpenAI SDK Quickstart

Because N-ATLaS conforms to the OpenAI specification, you can also use the official OpenAI SDK:

```python
from openai import OpenAI
import os

client = OpenAI(
    base_url="https://<workspace>--natlas-engine-natlasapi-serve.modal.run/v1",
    api_key=os.environ.get("NATLAS_API_KEY", "your-key")
)

response = client.chat.completions.create(
    model="NCAIR1/N-ATLaS",
    messages=[{"role": "user", "content": "Kedu kwanu?"}]
)

print(response.choices[0].message.content)
```
