# Farawa Cikin Sauri (Bilingual Guide: Harshen Hausa)

Wannan ita ce takardar jagora a harshen Hausa ga masu haɓaka software (developers) da ke son amfani da fasahar **N-ATLaS**.

!!! note "Attribution na Ƙasa"
    **N-ATLaS shiri ne na Ma'aikatar Sadarwa, Ƙirƙira da Tattalin Arzikin Dijital ta Tarayya (Federal Ministry of Communications, Innovation and Digital Economy), tare da haɗin gwiwar Awarri Technologies.**

---

## 1. Shigarwa (Installation)

=== "Python"
    ```bash
    pip install ./python-sdk
    ```

=== "JavaScript / TypeScript"
    ```bash
    npm install ./js-sdk
    ```

---

## 2. Misalin Tattaunawa na Farko (First Chat in Hausa)

```python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.HA),
    {"role": "user", "content": "Sannu! Ka ba ni misali na yadda fasahar AI za ta taimaki manoma a Najeriya."}
])

print(response.message.content)
```

---

## 3. Fassara Murya zuwa Rubutu (Speech-to-Text a Hausa)

N-ATLaS yana da ƙirar fasahar saurare da rubuta sautin harshen Hausa mai matuƙar ƙwarewa (`NCAIR1/Hausa-ASR`):

```python
with open("sautin_hausa.wav", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Hausa-ASR",
        language="ha"
    )

print("Abin da aka faɗa:", result.text)
```
