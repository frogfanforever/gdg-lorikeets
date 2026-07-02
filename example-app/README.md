# example-app

A bootstrapped **Nx monorepo** on the hackathon stack, built as the first
"produce code → eval → then commit" cycle. Domain: **projects & tasks**.

```
example-app/
  apps/
    api/        NestJS + Sequelize REST API (projects, tasks)
    frontend/   Angular (standalone, signals, OnPush) reading the API
  docker/
    docker-compose.yml     Postgres 16
    init/                  schema + seed (3 projects, 6 tasks)
  eval-results/            metrics gathered before commit (see METRICS.md)
```

## Stack
Nx · NestJS · Sequelize (`sequelize-typescript`) · Postgres 16 (Docker) · Angular ·
Swagger · class-validator.

## Run it
```bash
npm install
docker compose -f docker/docker-compose.yml up -d     # Postgres + seed
npx nx serve api                                       # http://localhost:3000/api (Swagger at /api)
npx nx serve frontend                                  # http://localhost:4200
```

## API
Base `http://localhost:3000/api`, global `ValidationPipe`, Swagger at `/api`.

| Resource | Endpoints |
|----------|-----------|
| projects | `GET /project`, `GET /project/search?name=`, `GET /project/:id`, `POST`, `PUT/:id`, `PATCH/:id`, `DELETE/:id` |
| tasks | `GET /task`, `GET /task/:id`, `POST`, `PUT/:id`, `DELETE/:id` |

`projects(id, name, description, status['active'|'archived'])` ·
`tasks(id, projectId, title, done, priority 1-5)` with FK `task.projectId → project`.

## Evaluated before commit ✅
Scored with the repo's eval harness against a live instance — **16/16 acceptance
cases, c0.3 / c0.4 / p4.2 = 1.0**. See `eval-results/METRICS.md`. Dataset:
`../ai/evals/datasets/example-app/api-cases.jsonl`.

```bash
# from repo root, with the app running:
python ai/evals/api_eval.py \
  --dataset ai/evals/datasets/example-app/api-cases.jsonl \
  --base-url http://localhost:3000 --include-mutating
```
