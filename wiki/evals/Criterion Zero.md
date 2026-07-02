---
tags: [eval, judging]
aliases: [Gate, c0]
---

# Criterion Zero

The **necessary condition** in the [[Judging Criteria]]: the app must fulfil its
assigned domain task with correct, sensible AI output. Fail it and the score is
**void** — a polished demo that doesn't solve the problem is disqualified.

Doc: `ai/evals/criteria/00-criterion-zero.md` · rubric id `c0`.

## Checks (all must pass)
- `c0.1` fulfils the assigned domain task
- `c0.2` AI/algorithms process the problem correctly
- `c0.3` outputs substantively correct on real inputs
- `c0.4` core function genuinely works end-to-end (not mocked)

## How it's enforced
The [[Scoreboard]] voids the total to 0 if any `c0.*` check < 1. Measured, not
guessed:
- `c0.3` / `c0.4` ← the [[API Acceptance Eval]] pass-rate (backend correctness)
- deep dive ← [[WCS]] AI Output Quality

## Fastest ways to fail
Demo works on one cherry-picked input · fluent-but-wrong AI output · a UI shell
with hard-coded logic.

See also: [[Eval Suite]] · [[Winning Playbook]] · [[Home]]

#eval
