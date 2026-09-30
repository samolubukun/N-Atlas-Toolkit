# Ìbẹ̀rẹ̀ Kíákíá (Bilingual Guide: Èdè Yorùbá)

Èyí ni ìwé ìtọ́ni ní èdè Yorùbá fún àwọn oníṣẹ́-ọnà (developers) tó fẹ́ lo ìmọ̀-ẹ̀rọ **N-ATLaS**.

!!! note "Àmì Ìdánimọ̀ Ọba"
    **N-ATLaS jẹ́ àgbékalẹ̀ láti ọwọ́ Ilé-iṣẹ́ Ìjọba Àpapọ̀ ti Ìbánisọ̀rọ̀, Ìmọ̀-ìjìnlẹ̀ àti Ọrọ̀-ajé Oní-nọ́ńbà (Federal Ministry of Communications, Innovation and Digital Economy), pẹ̀lú àtìlẹ́yìn Awarri Technologies.**

---

## 1. Ìṣètò Àkọ́kọ́ (Installation)

=== "Python"
    ```bash
    pip install ./python-sdk
    ```

=== "JavaScript / TypeScript"
    ```bash
    npm install ./js-sdk
    ```

---

## 2. Àpẹẹrẹ Ìfọ̀rọ̀wérọ̀ Àkọ́kọ́ (First Chat in Yoruba)

```python
import natlas

client = natlas.Client()

response = client.chat([
    natlas.system_prompt(natlas.YO),
    {"role": "user", "content": "Ẹ n lẹ́ o! Ṣe àlàyé nípa bí ìmọ̀ ẹ̀rọ AI ṣe lè ran àwọn àgbẹ̀ lọ́wọ́."}
])

print(response.message.content)
```

---

## 3. Ìyípadà Ohùn sí Ọ̀rọ̀ (Speech-to-Text ni Yorùbá)

N-ATLaS ní ìmọ̀-ẹ̀rọ tó tayọ fún gbígbọ́ àti kíkọ ohùn èdè Yorùbá (`NCAIR1/Yoruba-ASR`):

```python
with open("ohun_yoruba.wav", "rb") as f:
    result = client.audio.transcriptions.create(
        file=f,
        model="NCAIR1/Yoruba-ASR",
        language="yo"
    )

print("Ọ̀rọ̀ tó sọ:", result.text)
```
