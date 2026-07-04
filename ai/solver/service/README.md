# Solver BE (MVP)

Minimal backend for the inventive-problem solver — **endpoint 1**: define a problem,
reframe it as a **contradiction per available method**, present them to the user, and
persist each reframing as an inspectable `StepResult`.

Pure **stdlib** (`http.server` + `sqlite3`), reusing `ai/solver` domain logic. It
collapses the "API + Solver + DB" tiers of `wiki/design/Backend Architecture` into one
hostable process for the MVP; the endpoint contract is the same when it later splits
into NestJS + Python solver + Postgres.

## Run
```bash
python -m ai.solver.service                       # 127.0.0.1:8080, in-memory db
PORT=8080 SOLVER_DB=./solver.db python -m ai.solver.service   # persist to a file
# or containerised (build from repo root):
docker build -f ai/solver/service/Dockerfile -t solver-be . && docker run -p 8080:8080 solver-be
```
Offline **stub LLM** by default (no keys). Wire Gemini/Vertex by calling
`ai.solver.service.serve(llm=<callable>)`.

## Endpoints
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | liveness + registered methods |
| GET | `/methods` | available concept-generation methods |
| POST | `/runs` | define a problem → a contradiction per method |
| GET | `/runs/{id}` | run + contradictions + recorded `StepResult`s |

**POST /runs**
```json
{ "problem": {"title": "...", "statement": "...", "sdg": "SDG 12"},
  "methods": ["triz", "scamper"] }        // optional; defaults to all, TRIZ mandatory
```
→ `201 { run_id, problem, methods, contradictions:[{method, improving, preserving, summary}] }`.
Validation: `400` missing title/statement, `422` unknown method or TRIZ omitted, `404` unknown run.

## Persistence = the StepResult store
Each reframing writes a `steps` row: `inputs · output · method · model+params ·
tokens · cost · duration_ms · status · version` — the "Step Result Recorded" event,
and the seam for later edit → re-run-from-step → version.

## Eval
`ai/evals/be_eval.py` (dataset `ai/evals/datasets/solver-be/`) runs acceptance cases
against a live instance → `c0.3 / c0.4 / p4.1`. Verified **9/9** on the reference MVP
and against the live Cloud Run URL.

## Deploy & CI/CD (Cloud Run)
Live: **https://solver-be-66obdg3tha-ew.a.run.app** (project `my-gdg-lorikeets`,
europe-west1, public).

- **Build/deploy config:** `cloudbuild.yaml` — build (`ai/solver/service/Dockerfile`)
  → push to Artifact Registry (`solver-be-repo`, image tagged with the commit SHA) →
  `gcloud run deploy`. `.gcloudignore` (repo root) keeps the upload tiny.
- **CI/CD:** `.github/workflows/deploy-solver-be.yml` — on every push to `main` under
  `ai/solver/**`, GitHub Actions authenticates via **Workload Identity Federation**
  (keyless, no secrets) as `gh-deploy@my-gdg-lorikeets.iam.gserviceaccount.com` and
  runs `gcloud builds submit --config cloudbuild.yaml`, publishing a new Cloud Run
  revision tagged with the commit SHA.
- **Manual deploy:**
  ```bash
  gcloud builds submit --project=my-gdg-lorikeets \
    --config ai/solver/service/cloudbuild.yaml --substitutions=_TAG=$(git rev-parse --short HEAD) .
  ```
- **Note:** the container DB is ephemeral sqlite (per-instance) — fine for the demo
  endpoint; swap to Cloud SQL when runs must persist across instances.
