# Tura Fasaha zuwa Server (Deployment a Harshen Hausa)

Yadda ake amfani da N-ATLaS a kan kwamfuta ko kuma uwar-garken gida (server).

---

## 1. Amfani a Kan Gizagizai (Modal Cloud)

Don tura wannan tsarin a kan Modal cikin 'yan daƙiƙu:

```bash
modal deploy natlas_engine.py
```

---

## 2. Amfani a Kan Docker (A Cikin Gida / On-Premises)

Ga hukumomi ko kamfanonin da ke son adana bayanan su a cikin gida 100%:

```bash
docker compose up -d --build
```
Dukkan tsarin zai fara aiki a kan `http://localhost:8000`.
