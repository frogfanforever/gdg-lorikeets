---
tags: [eval]
aliases: [Evals, Evaluation Suite]
---

# Eval Suite

Our own "evaluation scoreboard" turned on ourselves: score the project the way the
panel will, find gaps, fix them before the finale. Mirrors the [[Judging Criteria]].

> 📄 **Canonical:** `ai/evals/README.md` (+ `criteria/00–08.md`, one per criterion).

## Parts
- [[Scoreboard]] — the runnable 0–100 scorer (`scoreboard.py` + `rubric.jsonl`)
- [[Criterion Zero]] — the pass/fail gate
- [[WCS]] — deterministic AI-code scoring
- [[API Acceptance Eval]] — fullstack backend measurement
- [[MCP Acceptance Eval]] — MCP server measurement (p5.3)

## Fill scores three ways
Self-assessment · LLM-judge (prompts in `criteria/*.md`) · **deterministic**
([[WCS]] + [[API Acceptance Eval]] + [[MCP Acceptance Eval]], all `--merge` into
`scores.json`).

See also: [[Winning Playbook]] · [[Home]]

#eval
