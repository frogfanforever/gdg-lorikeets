# Eval 00 — Criterion Zero (GATE, pass/fail)

**Rubric id:** `c0` · **Type:** gate · **Weight:** none — but failing voids the
entire score. Source: `#ewaluacja-punktów` (Adrian Romański, 30 Jun 2026).

> The app must fulfill the assigned domain task. AI tools and algorithms must
> correctly and logically process the problem and return substantively correct,
> sensible solutions. If the system doesn't fulfill the basic business function,
> the project fails Client verification.

## Checks (all must PASS = rating 1)
| id | check |
|----|-------|
| c0.1 | App fulfills the **assigned domain task** — solves the actual problem, not a lookalike |
| c0.2 | AI tools / algorithms process the problem **correctly and logically** |
| c0.3 | Outputs are **substantively correct and sensible** on real inputs |
| c0.4 | Core business function is **genuinely working end-to-end** (not mocked/hard-coded) |

## Evidence to collect
- The assigned domain task statement (get it from the organizers / GDG site).
- 5–10 real inputs run through the live app with their outputs.
- Proof the AI path is live (network calls to Gemini, not stubbed responses).
- A walkthrough of the core happy path on the deployed URL.

## LLM-judge prompt
```
You are a Client verifying a delivered product against its contract.
ASSIGNED TASK: <paste the team's assigned domain task>
EVIDENCE: <paste inputs+outputs, live URL notes, code excerpts>

For each check c0.1–c0.4, decide PASS (1) or FAIL (0) and justify in one line.
Be strict: if the core function is faked, stubbed, or returns nonsense on
realistic inputs, it FAILS. Return JSON: {"c0.1":0|1, ..., "notes":"..."}.
```

## Fastest ways to lose here
- Demo works only on one cherry-picked input.
- AI output looks fluent but is factually wrong for the domain.
- The "product" is a UI shell with the real logic hard-coded.
