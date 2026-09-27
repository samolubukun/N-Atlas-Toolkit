# Mbupụ na Mmejuputa (Deployment n'Asụsụ Igbo)

Otu ị ga-esi tinye N-ATLaS n'ọrụ na kọmputa ma ọ bụ na sava (server).

---

## 1. Iji Ya na Igwe Ojii (Modal Cloud)

Iji tinye ya na Modal n'ime sekọnd ole na ole:

```bash
modal deploy natlas_engine.py
```

---

## 2. Iji Ya na Docker (N'ime Ụlọ / On-Premises)

Maka ụlọ ọrụ chọrọ idobe data ha 100% n'ime ụlọ ọrụ ha:

```bash
docker compose up -d --build
```
Ihe niile ga-amalite ịrụ ọrụ na `http://localhost:8000`.
