# Eval 06 — Pitch & Client/Investor Readiness (ADDITIONAL)

**Rubric id:** `x1` · **Type:** advisory (not in the 100 pts, but decisive).
Rationale: the panel explicitly judges as **Client + Potential Investor**
(`judging-criteria.md`). Two projects with equal points are separated here.

## Checks
| id | check |
|----|-------|
| x1.1 | Business value and target market are **explicit** |
| x1.2 | Story arc: **problem → solution → working product → market** |
| x1.3 | Demo **explicitly touches all 5 pillars** (name what you used each day) |
| x1.4 | Clear **ask / next step** for the "investor" |

## Evidence to collect
- The demo script / slide outline.
- A 30-second "why this matters commercially" statement.
- A checklist mapping demo beats → the 5 pillars.

## LLM-judge prompt
```
Act as a client and an investor watching a 5-minute hackathon demo. Score
x1.1–x1.4 from 0..1. Reward clarity on value, market, and a working product;
penalize tech-only demos with no business framing. EVIDENCE: <paste script>.
Return JSON {"x1.1":0..1, ..., "notes":"..."}.
```

## Play to run
Open with the persona+problem (Perdek's Day 1), show the working product solving
it live (Criterion Zero), then narrate the stack pillar-by-pillar so each judge
hears their day, and close with a concrete ask. Name the tools by name.
