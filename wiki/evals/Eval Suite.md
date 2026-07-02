---
tags: [eval]
aliases: [Evals, Evaluation Suite]
---

# Eval Suite

Our own "evaluation scoreboard" (the Day-4 skill) turned on ourselves: score the
project the way the panel will, find gaps, fix them before the finale. Lives in
`ai/evals/`, mirrors the [[Judging Criteria]].

## Pieces
- `rubric.jsonl` — machine-readable criteria + checks + points
- [[Scoreboard]] (`scoreboard.py`) — runnable 0–100 scorer with the gate
- `scores.example.json` — sample self-assessment
- `criteria/00–08.md` — one doc per criterion (checks, evidence, LLM-judge prompt)
- [[WCS]] (`wcs/`, `wcs_to_scores.py`) — deterministic AI-code scoring
- [[API Acceptance Eval]] (`api_eval.py`, `datasets/nan-stack/`) — fullstack measurement

## Criteria
- [[Criterion Zero]] — gate (pass/fail)
- Pillars 1–5 → the five days in [[Judging Criteria]]
- Advisory: Pitch/Client-Investor, Demo Reliability, AI Output Quality (→ [[WCS]])

## Three ways to fill scores
1. **Self-assessment** — rate each check 0..1.
2. **LLM-judge** — paste each criterion's judge prompt + evidence.
3. **Deterministic** — [[WCS]] for AI-code quality, [[API Acceptance Eval]] for the
   backend; both `--merge` straight into `scores.json`.

## Run
```bash
cd ai/evals
python scoreboard.py --template > scores.json
python scoreboard.py scores.json
```

See also: [[Winning Playbook]] · [[Home]]

#eval
