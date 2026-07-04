---
tags: [eval, judging]
aliases: [Gate, c0]
---

# Criterion Zero

The **necessary condition** in the [[Judging Criteria]]: the app must fulfil its
assigned domain task with correct, sensible AI output. Fail it and the score is
**void** — a polished demo that doesn't solve the problem is disqualified.

**The assigned task** ([[Hackaton task]]): an R&D inventive-problem solver that
reformulates a problem as a technical contradiction, generates candidates via **≥2
methods (TRIZ mandatory + a second)**, evaluates them, selects one, and shows the
full reasoning trail. The gate's teeth: **every step must be real, inspectable logic
— not one prompt dressed up to look structured.** That's what "AI processes the
problem correctly and logically" (`c0.2`) now concretely means.

> 📄 **Canonical:** `ai/evals/criteria/00-criterion-zero.md` (checks, evidence,
> LLM-judge prompt). Rubric id `c0`.

- The [[Scoreboard]] voids the total to 0 if any `c0.*` check < 1.
- Measured, not guessed: `c0.3`/`c0.4` come from the [[API Acceptance Eval]] pass-rate;
  the deep dive is [[WCS]] AI Output Quality.

See also: [[Eval Suite]] · [[Winning Playbook]] · [[Home]]

#eval
