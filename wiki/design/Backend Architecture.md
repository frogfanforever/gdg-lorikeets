---
tags: [design, architecture, backend]
aliases: [BE Architecture, Services, Backend]
---

# Backend Architecture

The service topology fitted to the [[Event Storming|event-storming pipeline]] — an
**iterative, editable, metadata-logging** inventive-problem solver. Uses the taught
[[Tech Stack]] and deploys per [[GCP Deployment]].

> 🗺️ **Diagram:** [[Backend Architecture.canvas|the architecture board]].

## Services (all Cloud Run)
| Tier | Service | Role |
|------|---------|------|
| Client | **Angular 19 + Nx** (Nginx) | reasoning UI: pipeline view, inspect/edit a step, re-run, compare versions |
| API | **NestJS + Prisma** | system of record + **orchestrator**: sequences the pipeline, persists every `StepResult`, handles edit → invalidate → resume; REST + WS/SSE |
| Reasoning | **Solver Service** (Python · `ai/solver`) | stateless compute: `reformulate → generate(per method) → evaluate → select → trail`; `resume_from(step, overrides)`; method registry (TRIZ · SCAMPER · +N) |
| Reasoning | **TRIZ MCP Server** (FastMCP + `pytriz`) | contradiction-matrix tools over Streamable HTTP `/mcp` |
| AI | **Vertex AI · Gemini 2.5** | LLM turns (reformulate, SCAMPER, optional LLM-judge) |
| Data | **Cloud SQL · Postgres** | `Problem · Run · RunVersion · Step(StepResult) · Candidate · Evaluation` |
| Infra | **Cloud Build → Artifact Registry**, **Cloud Logging** | CI/CD + telemetry (tokens/cost/latency from `StepResult`) |

## Why this split
- **NestJS owns state; the Solver is stateless.** All run/step/version persistence
  lives in one place (Prisma → Postgres), so **edit → re-run from step → version** is
  a DB-backed state machine; the Solver just recomputes given inputs + overrides. That
  is exactly the iteration lane on the board.
- **Methods stay pluggable** behind the Solver's `generate()` contract (TRIZ mandatory
  + a swappable second) — see [[Concept Generation Methods]].
- **Every step is inspectable** because each `StepResult` (inputs, output, method,
  model+params, cost, timing, version) is persisted — the [[Criterion Zero]] "real,
  inspectable logic" requirement, and the source of the Day-4 metrics + Day-5 perf.

## MVP status (endpoint 1 — live)
The first slice is built and evaluated: **`ai/solver/service`** (stdlib `http.server` +
`sqlite3`, reusing `ai/solver`) exposes `POST /runs` → **a contradiction per available
method**, persisting each as an inspectable `StepResult`. It collapses API+Solver+DB
into one hostable process for now (same contract when split later). Eval:
`ai/evals/be_eval.py` (+ `datasets/solver-be`) → **9/9**, `c0.3/c0.4/p4.1 = 1.0`.
```bash
python -m ai.solver.service            # host on :8080 (stub LLM, sqlite)
python ai/evals/be_eval.py --base-url http://localhost:8080 --gate
```
**Deployed & CI/CD:** live on Cloud Run at
`https://solver-be-66obdg3tha-ew.a.run.app` (project `my-gdg-lorikeets`, europe-west1,
public). Every push to `main` under `ai/solver/**` triggers **GitHub Actions →
Workload Identity Federation (keyless) → Cloud Build** (`ai/solver/service/cloudbuild.yaml`),
publishing a new Cloud Run revision tagged with the commit SHA. `be_eval` = 9/9,
`deploy_eval` `p5.1 = 1.0` against the live URL.

**NestJS realization (the target stack):** the same endpoint is now also implemented
as **`solvermaster/apps/solver-api`** — a NestJS app in the Nx monorepo (pluggable
method registry, in-memory `StepResult` store, stub LLM seam). Same wire contract, so
`be_eval` passes **9/9** against it too. CI/CD: `.github/workflows/deploy-solver-api.yml`
(Actions + WIF → Cloud Build → Cloud Run `solver-api`) on every push under
`solvermaster/apps/solver-api/**`.

### Live services & CI/CD (all Cloud Run, europe-west1, public)
| Service | What | URL |
|---------|------|-----|
| `solver-be` | Python MVP (stdlib) | `https://solver-be-66obdg3tha-ew.a.run.app` |
| `solver-api` | **NestJS/Nx** (target stack) | `https://solver-api-66obdg3tha-ew.a.run.app` |
| `solver-frontend` | **Angular/Nx** (Nginx, proxies `/api` → solver-api) | `https://solver-frontend-66obdg3tha-ew.a.run.app` |

Each has a GitHub Actions workflow (`.github/workflows/deploy-*.yml`) that, on push to
`main` under its paths, authenticates via **Workload Identity Federation** (keyless)
and runs **Cloud Build** → Artifact Registry (tagged by commit SHA) → `gcloud run
deploy`. `deploy_eval` `p5.1 = 1.0` across the deployed stack.

Next slices: generate candidates (per method) → evaluate → select → trail; then the
edit → `resume_from` → version loop; then in-memory store → Prisma + Cloud SQL; and a
solver-specific Angular UI (the current frontend is the demo placeholder).

## Maps to the event graph
Orchestrator ↔ backbone sequencing · method adapters ↔ *Candidates Generated (per
method)* · `Step` table ↔ *Step Result Recorded* · `resume_from` ↔ *Re-run from Edited
Step* · `RunVersion` ↔ *New Run Version Saved*.

See also: [[Event Storming]] · [[Concept Generation Methods]] · [[Tech Stack]] ·
[[GCP Deployment]] · [[Home]]

#design #architecture #backend
