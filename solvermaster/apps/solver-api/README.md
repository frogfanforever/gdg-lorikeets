# solver-api (NestJS · Nx)

The inventive-problem solver backend, ported from the Python MVP (`ai/solver/service`)
to **NestJS in the Nx monorepo** — same HTTP contract, so the shared eval
(`ai/evals/be_eval.py`) runs against it unchanged.

**Endpoint 1:** define a problem → a **contradiction per available method** (TRIZ
mandatory + a swappable second), each persisted as an inspectable `StepResult`.

## Layout
```
apps/solver-api/src/app/
  domain/  types · llm (stub, swap for Gemini) · methods (pluggable registry) ·
           reframe.service · store.service (in-memory StepResult store)
  runs/    runs.controller (POST /runs, GET /runs/:id) · runs.service
  misc.controller  (GET /, /health, /methods)
```

## Endpoints
`GET /health` · `GET /methods` · `POST /runs` · `GET /runs/:id` (served at root — no
global prefix — for parity with the Python service + be_eval). Validation: `400`
missing title/statement, `422` unknown method / TRIZ omitted, `404` unknown run.

## Run / build / test
```bash
cd solvermaster
npx nx serve solver-api                       # dev (http://localhost:8080)
npx nx build solver-api                        # → dist/apps/solver-api/main.js
node dist/apps/solver-api/main.js              # run the build
python ../ai/evals/be_eval.py --base-url http://localhost:8080 --gate   # 9/9
```

## Deploy & CI/CD
- `Dockerfile` (multi-stage Nx build → node runtime) + `cloudbuild.yaml`
  (build → push to Artifact Registry `solvermaster-repo`, tagged by commit SHA →
  `gcloud run deploy solver-api`).
- **CI/CD:** `.github/workflows/deploy-solver-api.yml` — on push to `main` under
  `solvermaster/apps/solver-api/**`, GitHub Actions authenticates via **Workload
  Identity Federation** (keyless) as `gh-deploy@my-gdg-lorikeets.iam.gserviceaccount.com`
  and runs Cloud Build, publishing a new Cloud Run revision per commit.
- Manual: `cd solvermaster && gcloud builds submit --config apps/solver-api/cloudbuild.yaml --substitutions=_TAG=$(git rev-parse --short HEAD) .`

## Next
In-memory store → Prisma + Cloud SQL; wire a real Gemini/Vertex LLM (replace the stub
in `domain/llm.ts`); add the generate → evaluate → select slices.
