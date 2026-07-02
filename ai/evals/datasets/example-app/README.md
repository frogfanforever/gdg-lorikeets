# example-app — API acceptance eval dataset

Eval **data** for the bootstrapped example app (`example-app/`, an Nx monorepo:
NestJS + Angular + Postgres + Docker). Measures **eval 04 (Fullstack/NestJS)** and
the **Criterion Zero** gate against the running API. Same format as the nan-stack
set; consumed by `../../api_eval.py`.

## Domain
```
projects(id, name, description, status['active'|'archived'])   # 3 seeded
tasks(id, project_id, title, done, priority 1-5)               # 6 seeded, FK -> projects
```
API base `http://localhost:3000/api` — `/project` and `/task` (CRUD +
`/project/search`), Swagger at `/api`, global ValidationPipe.

## Cases (`api-cases.jsonl`, 16)
list · by-id · 404 · search (hit+miss) · **relational integrity** (project 1 → 3
tasks, project 2 → 2) · **validation** (bad status enum, non-int priority, missing
name → 400) · create (mutating, opt-in). FK + validation cases are the highest-signal
[[Criterion Zero]] evidence.

## Run
```bash
cd ai/evals
python api_eval.py --dataset datasets/example-app/api-cases.jsonl --dry-run
# with the app up (see example-app/README):
python api_eval.py --dataset datasets/example-app/api-cases.jsonl \
  --base-url http://localhost:3000 --include-mutating --merge scores.json
python scoreboard.py scores.json
```

Rating mapping: `c0.3` (correctness), `c0.4` (end-to-end), `p4.2` (data layer) —
see the runner docstring.
