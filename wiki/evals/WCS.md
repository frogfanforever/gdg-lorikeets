---
tags: [eval, tool]
aliases: [web-codegen-scorer, fullRatings]
---

# WCS

**web-codegen-scorer** — generates a web app from a task prompt and scores it
**0–100** with deterministic ratings. Powers **eval 08 (AI Output Quality)**, the
measurement behind [[Criterion Zero]] `c0.3` and pillar-4 `p4.5`.

Vendored into the repo at `ai/evals/wcs/` (self-contained; `node_modules`
excluded). Doc: `ai/evals/criteria/08-ai-output-quality.md`.

## fullRatings (the bar we use)
`env/ratings/index.mjs` → 13 custom Angular ratings + **axe (a11y)** + build.
Wired into **stage 9** (`config.s9.mjs`). Grades exactly the [[Tech Stack]]
frontend conventions: signals, standalone, OnPush, typed models, services, etc.

## Loop
```bash
cd ai/evals/wcs && npm install
export GOOGLE_GENERATIVE_AI_API_KEY=your_key
./run-task.sh 9                         # or: ./run-task.sh 9 nan-users-table
cd .. && python wcs_to_scores.py wcs/.web-codegen-scorer/reports/stage-9 --merge scores.json
python scoreboard.py scores.json
```

`wcs_to_scores.py` maps a WCS `summary.json` → `x3.*` ratings (rating-agnostic, so
fullRatings incl. axe flows through). The bonus a11y signal also informs pillar 2.

## Custom tech-stack tasks
`tasks/nan-users-table.md` / `nan-orders-table.md` — codegen targets on the
[[API Acceptance Eval|nan-stack]] domain, written **tech-stack-first**.

See also: [[Eval Suite]] · [[Scoreboard]] · [[Home]]

#eval #tool
