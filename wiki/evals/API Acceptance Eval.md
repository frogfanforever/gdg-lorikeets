---
tags: [eval, tool]
aliases: [api_eval, nan-stack]
---

# API Acceptance Eval

Measures the **fullstack backend** (pillar 4) and the [[Criterion Zero]] gate
against a running API — best-matched to the **nan-stack** reference app
(NestJS + Sequelize + Postgres + Angular).

- Data: `ai/evals/datasets/nan-stack/api-cases.jsonl` (16 cases, pinned to the seed)
- Runner: `ai/evals/api_eval.py` (stdlib; offline `--dry-run`)
- Doc: `ai/evals/datasets/nan-stack/README.md`

## Domain
`users(id,name,surname,birthYear,email)` + `orders(id,userId,productName,quantity,amount)`,
served at `http://localhost:3000/api`.

## Cases
list · by-id · 404 · search · **relational integrity** (FK counts) · **validation**
(ValidationPipe 400s) · create (mutating, opt-in). The FK + validation cases are the
highest-signal [[Criterion Zero]] evidence.

## Rating mapping
| Rating | From |
|--------|------|
| `c0.3` | positive-case pass-rate |
| `c0.4` | overall pass-rate |
| `p4.2` | p4-tagged pass-rate |

## Run
```bash
cd ai/evals
python api_eval.py --dry-run                                  # offline validate
python api_eval.py --base-url http://localhost:3000 --merge scores.json
python scoreboard.py scores.json
```

See also: [[Eval Suite]] · [[WCS]] · [[Tech Stack]] · [[Home]]

#eval #tool
