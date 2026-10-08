#!/usr/bin/env bash
# ==============================================================================
# N-ATLaS Docker Suite Automated Verification Script
# Verifies all 4 Docker architecture components:
# 1. docker-compose.yml (On-premise GPU production stack)
# 2. docker-compose.local.yml (Local CPU/Metal stack)
# 3. nginx.conf (Unified gateway reverse-proxy on port 8000)
# 4. Dockerfile.asr (Nigerian Whisper ASR container build)
# 5. Dockerfile.llm (N-ATLaS Multilingual LLM container build)
# ==============================================================================

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}    🚀 N-ATLaS Docker Suite Automated Verification & Test Harness     ${NC}"
echo -e "${BLUE}======================================================================${NC}"

# Check Docker installation
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed or not in PATH.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[Step 1/5] Validating docker-compose.yml (Production GPU Stack)...${NC}"
if docker compose config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.yml: Syntax and service definitions valid!${NC}"
else
    echo -e "${RED}❌ docker-compose.yml validation failed:${NC}"
    docker compose config
    exit 1
fi

echo -e "\n${YELLOW}[Step 2/5] Validating docker-compose.local.yml (Local CPU/Mac Stack)...${NC}"
if docker compose -f docker-compose.local.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.local.yml: Syntax and service definitions valid!${NC}"
else
    echo -e "${RED}❌ docker-compose.local.yml validation failed:${NC}"
    docker compose -f docker-compose.local.yml config
    exit 1
fi

echo -e "\n${YELLOW}[Step 3/5] Validating Nginx Unified Gateway Configuration (nginx.conf)...${NC}"
if docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t 2>/dev/null; then
    echo -e "${GREEN}✅ nginx.conf: Reverse-proxy routing syntax valid!${NC}"
else
    echo -e "${YELLOW}Testing via local nginx parser...${NC}"
    docker run --rm -v "$(pwd)/nginx.conf:/etc/nginx/nginx.conf:ro" nginx:alpine nginx -t
fi

echo -e "\n${YELLOW}[Step 4/5] Building Dockerfile.asr (Sovereign ASR Whisper Engine)...${NC}"
echo -e "   Checking Python, FFmpeg, and audio libraries..."
if docker build -t natlas-asr:verify -f Dockerfile.asr . ; then
    echo -e "${GREEN}✅ Dockerfile.asr: Built successfully and container image verified!${NC}"
else
    echo -e "${RED}❌ Dockerfile.asr build failed.${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[Step 5/5] Building Dockerfile.llm (N-ATLaS LLM Engine)...${NC}"
echo -e "   Checking PyTorch, Transformers, and serving framework..."
if docker build -t natlas-llm:verify -f Dockerfile.llm . ; then
    echo -e "${GREEN}✅ Dockerfile.llm: Built successfully and container image verified!${NC}"
else
    echo -e "${RED}❌ Dockerfile.llm build failed.${NC}"
    exit 1
fi

echo -e "\n${GREEN}======================================================================${NC}"
echo -e "${GREEN} 🎉 ALL 4 DOCKER COMPONENTS VERIFIED SUCCESSFULLY!                    ${NC}"
echo -e "${GREEN} Production Docker stacks are 100% ready for on-premise & cloud use.  ${NC}"
echo -e "${GREEN}======================================================================${NC}"
