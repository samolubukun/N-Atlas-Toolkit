# Native Cultural Translation (`/v1/translate`)

Direct African language translation powered by N-ATLaS.

---

## Endpoint Specification

* **Path**: `POST /v1/translate`
* **Content-Type**: `application/json`
* **Authorization**: `Bearer <API_KEY>`

---

## Request Body

| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `text` | string | **Yes** | Source text to translate |
| `target_lang` | string | **Yes** | Destination language (`Yoruba`, `Hausa`, `Igbo`, `Pidgin`, `English`) |
| `tone` | string | No | Translation register: `formal`, `conversational`, `colloquial` |

---

## Example Usage

=== "cURL"
    ```bash
    curl -X POST https://<workspace>--natlas-engine-natlasapi-serve.modal.run/v1/translate \
      -H "Authorization: Bearer $NATLAS_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "text": "Education is the most powerful tool which you can use to change the world.",
        "target_lang": "Yoruba",
        "tone": "formal"
      }'
    ```

=== "Python SDK"
    ```python
    import natlas

    client = natlas.Client()
    result = client.post("translate", body={
        "text": "Education is the most powerful tool which you can use to change the world.",
        "target_lang": "Yoruba",
        "tone": "formal"
    })
    print(result["translation"])
    # Ẹ̀kọ́ jẹ́ irinṣẹ́ tó lágbára jù lọ tí o lè lo láti yí ayé padà.
    ```
