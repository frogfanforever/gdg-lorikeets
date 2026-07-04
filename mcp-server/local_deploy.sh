#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

MCP_PORT=8123
EMBEDDING_MODEL="embeddinggemma:300m" # Use the Ollama embedding model for semantic search
EMBEDDING_SERVICE_URL="http://host.docker.internal:11434/v1" # Using Ollama API on our machine

CONTAINER_NAME="gcp-triz-mcp-server"

docker build -t triz-mcp-server .

docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

docker run -d \
    --name "${CONTAINER_NAME}" \
    -p "${MCP_PORT}:${MCP_PORT}" \
    -e MCP_HOST=0.0.0.0 \
    -e MCP_PORT="${MCP_PORT}" \
    -e EMBEDDING_MODEL="${EMBEDDING_MODEL}" \
    -e EMBEDDING_SERVICE_URL="${EMBEDDING_SERVICE_URL}" \
    triz-mcp-server

echo "Running at http://localhost:${MCP_PORT}/mcp"
echo "Logs: docker logs -f ${CONTAINER_NAME}"
echo "Stop: docker stop ${CONTAINER_NAME}"
