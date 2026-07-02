# Eval 08 — AI Output Quality / deep Criterion Zero (ADDITIONAL)

**Rubric id:** `x3` · **Type:** advisory, but it is the *measurement* behind gate
check `c0.3` ("outputs are substantively correct and sensible") and scored check
`p4.5`. Treat it as the quantitative backbone of the whole submission.

## Checks
| id | check |
|----|-------|
| x3.1 | A **test set** of representative inputs with expected/acceptable outputs exists |
| x3.2 | **Automated pass-rate** measured (LLM-judge or assertions) |
| x3.3 | **Known failure modes** documented and mitigated |

## How to build it (fits this repo)
1. Collect 20–50 real domain inputs (the `ai/integrations/` pipeline can source
   these; store as `.jsonl`).
2. Define "acceptable output" per input — exact match, assertion, or a judge
   rubric.
3. Run the product's AI on each; score with assertions or an LLM-judge.
4. Report pass-rate + failure taxonomy. Show the number on stage.

## LLM-judge prompt (per test case)
```
INPUT: <case input>
EXPECTED / ACCEPTANCE CRITERIA: <what a correct answer must contain>
ACTUAL AI OUTPUT: <product output>
Is the actual output substantively correct and sensible for the assigned domain?
Return JSON {"pass": true|false, "reason": "...", "severity": "low|med|high"}.
```

## Why it wins
Criterion Zero is a **gate** — the single biggest risk to the whole score. A
measured pass-rate is the strongest possible evidence to the "Client" that the
product actually works, and it doubles as the Day-4 evaluation-scoreboard
deliverable (p4.5). Aggregate results feed straight into `scoreboard.py`.
