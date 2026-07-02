# 🧪 Evaluation Suite — Build with AI 2026

Evals that mirror the **official judging rubric** (see
`../context/hackathon/judging-criteria.md`): the **Criterion Zero** gate + **5
pillars × 20 pts = 100**, plus advisory evals for pitch, demo reliability, and AI
output quality. This is our own "evaluation scoreboard" (the Day-4 skill) turned
on ourselves — score the project the way the judges will, find the gaps, fix them
before the finale.

## Layout

```
ai/evals/
  README.md                 ← this file
  rubric.jsonl              ← machine-readable criteria + checks + points
  scoreboard.py             ← runnable scoreboard (stdlib only)
  scores.example.json       ← sample self-assessment (copy to scores.json)
  criteria/
    00-criterion-zero.md    ← the gate
    01-product-design-mvp.md
    02-uiux-a11y.md
    03-angular-nx-debugging.md
    04-fullstack-architecture-llm.md
    05-deployment-scale-optimization.md
    06-pitch-client-investor.md      (additional)
    07-demo-reliability.md           (additional)
    08-ai-output-quality.md          (additional — deep Criterion Zero)
```

## How to use

```bash
cd ai/evals
python scoreboard.py --template > scores.json   # blank sheet of every check
# edit scores.json: rate each check 0..1 (gate checks must be 1 to pass)
python scoreboard.py scores.json                # print the scoreboard
python scoreboard.py scores.json --md report.md # also emit a markdown report
```

Ratings are `0..1` per check id. For scored checks, earned = `points × rating`.
For the **gate**, every `c0.*` must be `1` or the total is **void** (Criterion
Zero: a great-looking app that doesn't solve the assigned task is disqualified).

## Scoring model

| Kind       | Counts toward 100? | Meaning                                      |
|------------|--------------------|----------------------------------------------|
| `gate`     | no (pass/fail)     | Must pass or score is void                    |
| `scored`   | yes                | 5 pillars, 20 pts each                         |
| `advisory` | no                 | Tie-breakers & framing (pitch, demo, AI eval) |

## Two ways to fill scores
- **Self-assessment** — the team rates honestly. Fast, subjective.
- **LLM-judge** — feed each criterion's judge prompt (in `criteria/*.md`) plus
  evidence (repo, screenshots, live URL) to a model and have it return the
  rating. Repeatable and closer to how the panel will reason. The `criteria/`
  files contain ready-to-paste judge prompts.

> These evals are our internal preparation instrument. The real scores come from
> the panel (Perdek, Romański, Mysior) acting as Client + Investor.
