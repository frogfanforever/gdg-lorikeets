# Eval 07 — Demo Reliability (ADDITIONAL)

**Rubric id:** `x2` · **Type:** advisory. Rationale: a product that crashes on
stage destroys Criterion Zero credibility regardless of code quality.

## Checks
| id | check |
|----|-------|
| x2.1 | Runs live **without crashes** on the happy path |
| x2.2 | **Seeded/realistic data** available for the demo |
| x2.3 | **Graceful fallback** if the LLM/API is slow or fails |

## Evidence to collect
- A dry-run recording of the exact demo path.
- A seed script / fixture dataset.
- A fallback path (cached response, timeout handling, retry, spinner + message).

## LLM-judge prompt
```
Act as a demo-day reliability reviewer. Score x2.1–x2.3 from 0..1. Reward
rehearsed happy paths, seeded data, and real fallbacks for slow/failed AI calls.
EVIDENCE: <paste>. Return JSON {"x2.1":0..1, ..., "notes":"..."}.
```

## Checklist before you present
- [ ] Rehearse the demo on the deployed URL (not localhost) end-to-end twice.
- [ ] Pre-seed data so the first screen isn't empty.
- [ ] Add a timeout + fallback around every Gemini call.
- [ ] Have a recorded backup video in case the venue Wi-Fi dies.
