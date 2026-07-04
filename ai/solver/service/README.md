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
against a live instance → `c0.3 / c0.4 / p4.1`. Verified **9/9** on the reference MVP.
