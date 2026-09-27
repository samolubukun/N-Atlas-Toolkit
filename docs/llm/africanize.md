# Cultural Tone Adapter (`/v1/africanize`)

Adapts standard global English text into authentic Nigerian cultural, business, and social contexts.

---

## Endpoint Specification

* **Path**: `POST /v1/africanize`
* **Authorization**: `Bearer <API_KEY>`

---

## Cultural Context Presets

- **`Lagos-Urban`**: Modern urban Nigerian professional / tech tone.
- **`Northern-Formal`**: Respectful, measured Northern Nigerian English cadence.
- **`Market-Commercial`**: High-engagement, relational Nigerian trade dialogue.
- **`Pidgin-Blend`**: Natural Nigerian English accented with common colloquial Pidgin particles (*sef*, *sha*, *na so*).

---

## Example Usage

=== "cURL"
    ```bash
    curl -X POST https://<workspace>--natlas-engine-natlasapi-serve.modal.run/v1/africanize \
      -H "Authorization: Bearer $NATLAS_API_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "content": "We must work hard and remain resilient in order to achieve our dreams.",
        "culture_context": "Lagos-Urban",
        "formality": "natural"
      }'
    ```

=== "Python SDK"
    ```python
    import natlas

    client = natlas.Client()
    result = client.post("africanize", body={
        "content": "We must work hard and remain resilient in order to achieve our dreams.",
        "culture_context": "Lagos-Urban",
        "formality": "natural"
    })
    print(result)
    ```
