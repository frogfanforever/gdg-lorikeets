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
Next slices: generate candidates (per method) → evaluate → select → trail; then the
edit → `resume_from` → version loop; then split into NestJS + Postgres.

## Maps to the event graph
Orchestrator ↔ backbone sequencing · method adapters ↔ *Candidates Generated (per
method)* · `Step` table ↔ *Step Result Recorded* · `resume_from` ↔ *Re-run from Edited
Step* · `RunVersion` ↔ *New Run Version Saved*.

See also: [[Event Storming]] · [[Concept Generation Methods]] · [[Tech Stack]] ·
[[GCP Deployment]] · [[Home]]

#design #architecture #backend
