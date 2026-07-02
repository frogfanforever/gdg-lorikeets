# Eval 04 — Fullstack (NestJS), Architecture, LLM Engineering (Day 4)

**Rubric id:** `p4` · **Type:** scored · **Max:** 20 pts

## Checks
| id | check | pts |
|----|-------|-----|
| p4.1 | **NestJS** backend wired to the Angular frontend | 4 |
| p4.2 | **SQL + Sequelize + Docker** data layer working | 4 |
| p4.3 | Sound **architecture**: layering, DI, error handling, config | 4 |
| p4.4 | **LLM (Gemini)** integration functioning in the product | 4 |
| p4.5 | **Evaluation scoreboard** and/or **autonomous agentic loop** for AI quality | 4 |

## Evidence to collect
- End-to-end request trace: Angular → NestJS → DB / Gemini → response.
- Migrations/models (Sequelize), `docker compose` for local stack.
- Architecture sketch (modules, providers, error boundaries).
- The LLM feature working live + the eval harness output (this repo's
  `ai/evals/scoreboard.py` or an inline eval loop).

## LLM-judge prompt
```
Act as a fullstack + LLM engineering judge. Score p4.1–p4.5 from 0..1. Require a
working front-to-back path and a real Gemini call. For p4.5, reward an actual
measured evaluation of AI output quality or an autonomous agentic loop, not a
claim. EVIDENCE: <paste>. Return JSON {"p4.1":0..1, ..., "notes":"..."}.
```

## Measured data (nan-stack)
`p4.1`, `p4.2` and the Criterion Zero gate can be **measured**, not self-rated,
against a real NestJS+Sequelize+Postgres app via the acceptance dataset in
`../datasets/nan-stack/` (users/orders, pinned to the seed):
```bash
cd ai/evals
python api_eval.py --dry-run                    # validate offline
python api_eval.py --base-url http://localhost:3000 --merge scores.json
python scoreboard.py scores.json
```
It writes `c0.3` (correctness), `c0.4` (end-to-end), `p4.2` (data layer). The
relational-integrity and ValidationPipe cases are direct gate evidence. See
`../datasets/nan-stack/README.md`.

## Our unfair advantage (p4.5)
The "evaluation scoreboard" check is exactly what this repo already does:
`ai/integrations/` ingests signal to `.jsonl`, and `ai/evals/scoreboard.py`
scores AI output against a rubric. Wire the product's AI output through an eval
loop and **show the scoreboard on screen** — most teams will hand-wave AI quality.
