# Ìgbéjáde àti Lílò (Deployment ni Èdè Yorùbá)

Bí o ṣe lè gbé N-ATLaS jáde lórí kọ̀mpútà tàbí ẹ̀rọ abẹ́lé (server).

---

## 1. Lílò lórí Àwọsánmọ̀ (Modal Cloud)

Láti gbé e jáde sí orí Modal ní ìṣẹ́jú àáyá díẹ̀:

```bash
modal deploy natlas_engine.py
```

---

## 2. Lílò lórí Docker (On-Premises)

Fún àwọn ilé-iṣẹ́ tó fẹ́ kí àwọn dátà wọn wà ní ìpamọ́ 100%:

```bash
docker compose up -d --build
```
Gbogbo rẹ̀ yóò bẹ̀rẹ̀ lórí `http://localhost:8000`.
