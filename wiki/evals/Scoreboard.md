---
tags: [eval, tool]
---

# Scoreboard

`ai/evals/scoreboard.py` — the runnable scorer for the [[Eval Suite]]. Reads
`rubric.jsonl` + a `scores.json` (per-check ratings 0..1) and prints the
[[Criterion Zero]] gate, the five 20-pt pillars, the total /100, and advisory
readiness. Pure stdlib.

## Model
| Kind | Counts to 100? | Behaviour |
|------|----------------|-----------|
| `gate` | no | must pass or total is **void** |
| `scored` | yes | 5 pillars × 20 |
| `advisory` | no | tie-breakers (pitch, demo, AI quality) |

Earned = `points × rating`. Gate checks must be `1`.

## Usage
```bash
python scoreboard.py --template > scores.json   # blank sheet
python scoreboard.py scores.json                # print board
python scoreboard.py scores.json --md report.md # markdown report
```

## Feeding it automatically
- [[WCS]] → `wcs_to_scores.py ... --merge scores.json` (fills `x3.*`)
- [[API Acceptance Eval]] → `api_eval.py ... --merge scores.json` (fills `c0.*`, `p4.2`)

See also: [[Eval Suite]] · [[Judging Criteria]] · [[Home]]

#eval #tool
