---
tags: [eval, tool]
---

# Scoreboard

The runnable scorer for the [[Eval Suite]]: reads `rubric.jsonl` + a `scores.json`
(per-check ratings 0..1) and prints the [[Criterion Zero]] gate, the five 20-pt
pillars, the total /100, and advisory readiness.

> 📄 **Canonical:** `ai/evals/scoreboard.py` (usage: `--template`, `--md`; the gate
> voids the total when unmet).

Fed automatically by [[WCS]] (`wcs_to_scores.py`, fills `x3.*`) and the
[[API Acceptance Eval]] (`api_eval.py`, fills `c0.*`/`p4.2`), both via `--merge`.

See also: [[Eval Suite]] · [[Judging Criteria]] · [[Home]]

#eval #tool
