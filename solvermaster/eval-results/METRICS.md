# Eval metrics — example-app

Gathered **before** committing, per the eval-first workflow. The app was built,
run against a real Postgres, and scored with the repo's `api_eval.py` harness.

- **Date:** 2026-07-03
- **Stack:** Nx monorepo · NestJS + Sequelize · Postgres 16 (Docker) · Angular
- **Dataset:** `ai/evals/datasets/example-app/api-cases.jsonl` (16 cases)
- **Command:**
  ```bash
  python ai/evals/api_eval.py \
    --dataset ai/evals/datasets/example-app/api-cases.jsonl \
    --base-url http://localhost:3000 --include-mutating
  ```

## Result: 16 / 16 passed ✅

| Rating | Meaning | Score |
|--------|---------|-------|
| `c0.3` | outputs substantively correct | **1.0** |
| `c0.4` | works end-to-end | **1.0** |
| `p4.2` | SQL/Sequelize data layer correct | **1.0** |

All cases green, including the high-signal ones:
- **Relational integrity** (FK): project 1 → 3 tasks, project 2 → 2 tasks.
- **Validation** (ValidationPipe): bad status enum, non-int priority, missing
  name → all correctly rejected with `400`.
- **404s** for missing ids and empty search.

## Build checks
- `nx build api` → success (webpack/tsc).
- `nx build frontend` → success (161.89 kB initial, 48.85 kB gzipped).

## Reproduce
```bash
cd example-app
npm install
docker compose -f docker/docker-compose.yml up -d      # Postgres + seed
node dist/apps/api/main.js                              # or: npx nx serve api
# in another shell, from repo root:
python ai/evals/api_eval.py --dataset ai/evals/datasets/example-app/api-cases.jsonl \
  --base-url http://localhost:3000 --include-mutating
```

Raw run log: `api-eval.log` · merged ratings: `scores.json`.
