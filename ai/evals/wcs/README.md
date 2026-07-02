# WCS — vendored scoring harness

Vendored copy of the **web-codegen-scorer (WCS)** harness that powers **eval 08**
(`../criteria/08-ai-output-quality.md`). Keeps the eval suite self-contained: the
exact ratings, configs, and tasks that define our AI-output-quality score live in
this repo instead of an external checkout.

**Source:** `wcs-edd` workshop repo (https://github.com/Lowgular/wcs-edd),
copied 2026-07-02. This is a snapshot, not a submodule — refresh manually if the
upstream changes.

## What's here (and what's not)
Included — everything needed to run the `fullRatings` bar (stage 9):
```
env/            configs (config.s*.mjs), ratings/, system-instructions, project/ (Angular starter)
eslint-rules/   the custom Angular ESLint rules the ratings enforce
agents/         custom runners (stage 9 uses agents/workflow-gated-agent.runner.mjs)
tasks/          executable task prompts (login-form, product-detail, ...)
package.json    pins web-codegen-scorer
run-task.sh / run-task.ps1   convenience runner
.env.example    template for the API key
```
Excluded (regenerable / heavy): `node_modules/`, `env/project/node_modules/`,
`.web-codegen-scorer/` reports, slides, wiki/RAG index, `.git`. See `.gitignore`.

## Run it (from this folder)
```bash
npm install                                   # installs web-codegen-scorer
cp .env.example .env                          # add GOOGLE_GENERATIVE_AI_API_KEY
export GOOGLE_GENERATIVE_AI_API_KEY=your_key  # aistudio.google.com/apikey
./run-task.sh 9                               # fullRatings (all Angular ratings + axe a11y + build)
```
Reports land in `./.web-codegen-scorer/reports/stage-9/<timestamp>/summary.json`.

## Feed the score back into the eval scoreboard
```bash
cd ..                                         # ai/evals
python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9 --merge scores.json
python scoreboard.py scores.json
```

`fullRatings` is defined in `env/ratings/index.mjs`:
all 13 custom Angular ratings + `axeRating` (accessibility) + `successfulBuildRating`.
