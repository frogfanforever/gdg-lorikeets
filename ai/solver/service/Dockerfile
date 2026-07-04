# Solver BE (MVP) — stdlib only, zero pip deps. Build from the repo root:
#   docker build -f ai/solver/service/Dockerfile -t solver-be .
FROM python:3.13-slim
WORKDIR /app

# Runtime deps (pytriz — real TRIZ matrix, BM25 offline). Copied first for layer cache.
COPY ai/solver/service/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY ai/ /app/ai/

ENV PYTHONUNBUFFERED=1 \
    HOST=0.0.0.0 \
    PORT=8080 \
    SOLVER_DB=/data/solver.db
RUN mkdir -p /data
EXPOSE 8080

CMD ["python", "-m", "ai.solver.service"]
