# solvermaster

The product **Nx monorepo** (formerly `example-app`) on the hackathon stack. Hosts
the real inventive-problem solver plus the original demo.

```
solvermaster/
  apps/
    solver-api/ NestJS backend for the solver — POST /runs → contradiction per method
                (ported from ai/solver/service; see apps/solver-api + its Dockerfile
                + cloudbuild.yaml; CI/CD via .github/workflows/deploy-solver-api.yml)
    api/        NestJS + Sequelize REST API (projects, tasks) — original demo
    frontend/   Angular (standalone, signals, OnPush) reading the demo API
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

### One-shot gate
`./eval-all.sh` does the whole loop and always tears down:
Postgres up → build + serve API → `api_eval --gate` → teardown. It **exits
non-zero if any case fails**, so it's a drop-in pre-commit / CI gate.
```bash
./eval-all.sh                # run the gate
SCOREBOARD=1 ./eval-all.sh   # also print the full-rubric scoreboard
```

## Deploy to Google Cloud ☁️
Two **Cloud Run** services (API + Angular/Nginx) backed by **Cloud SQL** (Postgres),
built and pushed via **Cloud Build → Artifact Registry** — the pillar-5 stack. See
`deploy/`:
- `apps/api/Dockerfile`, `apps/frontend/Dockerfile` + `apps/frontend/nginx.conf`
  (Nginx serves the SPA and reverse-proxies `/api` to the backend — same-origin,
  no CORS).
- `deploy/cloudbuild.yaml` — builds + pushes both images.
- `deploy/deploy.sh` — one idempotent flow: enable APIs → Artifact Registry →
  Cloud SQL → Cloud Build → deploy both services (Cloud SQL socket, dynamic URL
  injection) → seed 3 projects + 6 tasks via the live API → print URLs.

```bash
gcloud auth login
PROJECT=<your-gcp-project> ./deploy/deploy.sh            # deploy (region defaults to europe-west1)
PROJECT=<your-gcp-project> ./deploy/deploy.sh cleanup    # tear it all down
```
The API creates its own schema on boot when `DB_SYNC=true` (set by `deploy.sh`);
locally the schema/seed still comes from `docker/init/` so dev + evals are
unchanged. Verify a live deploy with `python ai/evals/deploy_eval.py
--frontend-url <url> --backend-url <url> --tls-check` (→ rating `p5.1`).

> **Live reference deploy** (project `my-gdg-lorikeets`, europe-west1, 2026-07-03):
> frontend `https://example-frontend-410644511969.europe-west1.run.app`, API
> `…/api`. `deploy_eval` = `p5.1 1.0`. Ephemeral — may be torn down to avoid charges.

