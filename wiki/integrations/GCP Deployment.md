---
tags: [integration, cloud, cicd, ai]
aliases: [CI/CD, Cloud Run, Cloud Build, BuildWithAI, gcp-deploy]
---

# GCP Deployment

The **Day-5 deployment reference**: the workshop's `gcp-deploy` branch ships a
complete, deployable **BuildWithAI** stack + a Cloud Build **CI/CD** pipeline —
exactly the artifacts pillar 5 rewards (`p5.1` live on Cloud Run, `p5.2` CI/CD,
`p5.4` Cloud SQL/stateless, `p5.5` perf). Copy its shape and we bank most of the
20 pts. See [[Judging Criteria]].

> 📄 **Source:** github.com/mmysior/gdg-mcp-workshop **@gcp-deploy** (read
> 2026-07-03). A big step up from `main` (single MCP server) → a 4-service
> product. Trainers: Moksh Atukuri, Jacek Kubiak.

## Architecture — 4 Cloud Run services + Cloud SQL
```
Angular 19 + Nx  (Nginx)            Cloud Run · public
   │ POST /api/solve
NestJS + Prisma                     Cloud Run · public ──► Cloud SQL (Postgres 15)
   │ HTTP                                                    (Cloud SQL Auth Proxy / socket)
Google ADK agent (gemini-2.5-flash, Vertex AI)   Cloud Run
   │ McpToolset · Streamable HTTP
TRIZ MCP server (FastMCP + pytriz)  Cloud Run · /mcp
```
Bottom-up deploy; each service's URL is injected into the next via env vars
(`MCP_SERVER_URL` → `ADK_AGENT_URL` → `BACKEND_URL`). Backend runs `prisma db
push` on boot. Note: on `gcp-deploy` the MCP server is **self-contained** (`pytriz`
`TRIZStore()`, no external Ollama) — unlike `main`, which used the embeddings
container. See [[MCP Server]].

## CI/CD — Cloud Build → Artifact Registry
- **`cloudbuild.yaml`** — one pipeline: builds all 4 images (`DOCKER_BUILDKIT=1`)
  and pushes `--all-tags` to Artifact Registry
  `${_REGION}-docker.pkg.dev/${_PROJECT_ID}/${_REGISTRY_NAME}`. `logging:
  CLOUD_LOGGING_ONLY`.
- **`build-{mcp,agent,backend,frontend}.yaml`** — per-service builds (auto-push
  via `images:`), for fast single-service iteration.
- **`Makefile`** — the whole lifecycle: `install-tools` (uv) · `install-deps`
  (npm + `prisma generate`) · `gcp-init` · `gcp-enable-apis` (artifactregistry,
  run, sqladmin, compute, cloudbuild, aiplatform) · `gcp-create-registry` ·
  `gcp-create-db` (Postgres 15, db-f1-micro) · `build-*` (`gcloud builds submit`)
  · `deploy-*` (`gcloud run deploy --min-instances=1`) · `show-urls` · `gcp-cleanup`.
- **`docker-compose.yml`** — local 5-container mirror (db + mcp + agent + backend
  + frontend) for `docker compose up --build`.
- Enterprise gotcha: org policies `run.allowedMembers` /
  `iam.allowedPolicyMemberDomains` block public Cloud Run — the README ships a
  `gcloud org-policies set-policy` bypass.

## Deploy in one flow
```bash
make gcp-init GCP_PROJECT=<id> && make gcp-enable-apis
make gcp-create-registry REGION=europe-west1 && make gcp-create-db
make build-all        # Cloud Build → Artifact Registry (4 images)
make deploy-mcp && make deploy-agent && make deploy-backend && make deploy-frontend
make show-urls        # live Cloud Run URLs
```

## Our live deploy (proof it works end-to-end)
The repo's `example-app` (NestJS + Sequelize + Angular) is **already deployed** with
this exact pattern — see `example-app/deploy/` (`cloudbuild.yaml` + `deploy.sh`, a
one-command idempotent flow). Two Cloud Run services (API + Angular/Nginx) on Cloud
SQL Postgres, europe-west1, seeded via the live API. Differences from the workshop
reference: **Sequelize** (not Prisma), `synchronize` gated behind `DB_SYNC`, and the
Angular frontend calls a relative `/api` that Nginx proxies to the backend (no CORS).
First live run (`my-gdg-lorikeets`, 2026-07-03) passed [[Deploy Reachability Eval]]
at `p5.1 = 1.0`. Tear down with `./deploy/deploy.sh cleanup`.

## Why it matters for the win — and how we measure it
`p5.1` alone is **6 pts** (the biggest single check) and a live URL props up
[[Criterion Zero]]. Deterministic evals against the deployed stack:
- **`p5.1`** — [[Deploy Reachability Eval]] (`deploy_eval.py`) pings the live
  Cloud Run endpoints.
- **`p5.3`** — [[MCP Acceptance Eval]] (`mcp_eval.py --url https://…run.app/mcp`).
- `--min-instances=1` (warm) + MCP 2Gi are the `p5.5` cold-start story;
  Cloud Logging is the `p5.5`/observability story.

See also: [[Tech Stack]] · [[MCP Server]] · [[Eval Suite]] · [[Winning Playbook]] · [[Home]]

#integration #cloud #cicd #ai
