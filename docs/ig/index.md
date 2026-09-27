# Mbido Ọsọ Ọsọ (Bilingual Guide: Asụsụ Igbo)

Nke a bụ akwụkwọ ntuziaka n'asụsụ Igbo maka ndị na-emepụta ngwanrọ (developers) chọrọ iji teknụzụ **N-ATLaS** arụ ọrụ.

!!! note "Nkwanye Ùgwù Obodo"
    **N-ATLaS bụ atumatu nke Federal Ministry of Communications, Innovation and Digital Economy, nke ụlọ ọrụ Awarri Technologies na-akwado.**

---

## 1. Nwụnye Ngwanrọ (Installation)

=== "Python"
    ```bash
    pip install ./python-sdk
    ```

=== "JavaScript / TypeScript"
    ```bash
    npm install natlas
    ```

---

## 2. Mkparịta Ụka Nke Mbụ (First Chat in Igbo)

```python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.IG),
    {"role": "user", "content": "Kedu ka ị mere? Kọwaa otu AI nwere ike isi nyere ụmụ akwụkwọ aka na Naịjirịa."}
])

print(response.message.content)
```

---

## 3. Ntụgharị Olu gaa na Ederede (Speech-to-Text n'Igbo)

N-ATLaS nwere ụdị Whisper pụrụ iche maka ịghọta na idegharị olu asụsụ Igbo (`NCAIR1/Igbo-ASR`):

```python
with open("olu_igbo.wav", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Igbo-ASR",
        language="ig"
    )

print("Ihe e kwuru:", result.text)
```
