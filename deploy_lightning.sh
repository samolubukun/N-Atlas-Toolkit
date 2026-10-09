#!/bin/bash
lightning deployment create \
  --name natlas-engine \
  --studio this_studio \
  --command "uvicorn natlas_engine_lightning:app --host 0.0.0.0 --port 8000" \
  --machine T4 \
  --min-replicas 0 \
  --max-replicas 1 \
  --port 8000
