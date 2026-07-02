---
tags: [eval, tool]
aliases: [api_eval, nan-stack]
---

# API Acceptance Eval

Measures the **fullstack backend** (pillar 4) and the [[Criterion Zero]] gate against
a running API — best-matched to the **nan-stack** reference (NestJS + Sequelize +
Postgres).

> 📄 **Canonical:** `ai/evals/datasets/nan-stack/README.md` (+ `api-cases.jsonl`,
> runner `ai/evals/api_eval.py`).

- 16 acceptance cases over users/orders: list, by-id, 404, search, **relational
  integrity** (FK counts), **validation** (400s), create.
- Maps pass-rate → `c0.3`, `c0.4`, `p4.2`; `--merge` into `scores.json`, then run
  the [[Scoreboard]]. Offline `--dry-run` validates the dataset.

See also: [[Eval Suite]] · [[WCS]] · [[Tech Stack]] · [[Home]]

#eval #tool
