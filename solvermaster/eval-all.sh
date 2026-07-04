#!/usr/bin/env bash
#
# One-shot eval gate for example-app.
#   Postgres (Docker) up  ->  build + serve API  ->  api_eval acceptance  ->  teardown
#
# Exits non-zero if any acceptance case fails, so it works as a pre-commit / CI gate.
# Teardown (kill API, docker compose down -v) always runs, even on failure.
#
# Usage:
#   ./eval-all.sh                # run the full gate
#   SCOREBOARD=1 ./eval-all.sh   # also print the full-rubric scoreboard (needs a
#                                # complete scores.json — meaningful once we have
#                                # the real domain + all pillar ratings)
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$APP_DIR/.." && pwd)"
COMPOSE="$APP_DIR/docker/docker-compose.yml"
DATASET="$REPO_ROOT/ai/evals/datasets/example-app/api-cases.jsonl"
RESULTS="$APP_DIR/eval-results"
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_PID=""

log() { printf '\n\033[1;36m▶ %s\033[0m\n' "$*"; }

cleanup() {
  local code=$?
  log "Teardown"
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  docker compose -f "$COMPOSE" down -v >/dev/null 2>&1 || true
  [ $code -eq 0 ] && printf '\n\033[1;32m✅ GATE PASSED\033[0m — metrics in %s\n' "$RESULTS" \
                  || printf '\n\033[1;31m❌ GATE FAILED\033[0m (exit %s)\n' "$code"
  exit $code
}
trap cleanup EXIT INT TERM

cd "$APP_DIR"
mkdir -p "$RESULTS"

[ -d node_modules ] || { log "npm install"; npm install; }

log "Start Postgres"
docker compose -f "$COMPOSE" up -d
n=0
until [ "$(docker inspect -f '{{.State.Health.Status}}' example-app-db 2>/dev/null)" = healthy ] || [ $n -ge 60 ]; do
  n=$((n + 1)); sleep 1
done
[ "$(docker inspect -f '{{.State.Health.Status}}' example-app-db 2>/dev/null)" = healthy ] \
  || { echo "Postgres did not become healthy"; exit 1; }

log "Build API"
npx nx build api

log "Serve API"
node dist/apps/api/main.js > "$RESULTS/api-serve.log" 2>&1 &
API_PID=$!
n=0
until curl -sf "$BASE_URL/api/project" >/dev/null 2>&1 || [ $n -ge 60 ]; do
  n=$((n + 1)); sleep 1
done
curl -sf "$BASE_URL/api/project" >/dev/null 2>&1 \
  || { echo "API did not come up:"; tail -20 "$RESULTS/api-serve.log"; exit 1; }

log "Run acceptance eval (gate)"
python3 "$REPO_ROOT/ai/evals/api_eval.py" \
  --dataset "$DATASET" --base-url "$BASE_URL" --include-mutating --gate \
  --merge "$RESULTS/scores.json" | tee "$RESULTS/api-eval.log"

if [ "${SCOREBOARD:-0}" = "1" ]; then
  log "Full-rubric scoreboard"
  python3 "$REPO_ROOT/ai/evals/scoreboard.py" "$RESULTS/scores.json" || true
fi
