---
tags: [eval, tool]
aliases: [web-codegen-scorer, fullRatings]
---

# WCS

**web-codegen-scorer** — generates a web app from a task prompt and scores it
**0–100** with deterministic ratings. Powers **eval 08 (AI Output Quality)**, the
measurement behind [[Criterion Zero]] `c0.3` and pillar-4 `p4.5`.

> 📄 **Canonical:** `ai/evals/criteria/08-ai-output-quality.md` + vendored harness
> at `ai/evals/wcs/` (see its README). Bridge: `ai/evals/wcs_to_scores.py`.

- **fullRatings** (stage 9) = all Angular ratings + **axe (a11y)** + build — grades
  the [[Tech Stack]] frontend conventions (signals, standalone, OnPush, typed
  models, services).
- Custom tech-stack tasks on the [[API Acceptance Eval|nan-stack]] domain:
  `wcs/tasks/nan-users-table.md`, `nan-orders-table.md`.

See also: [[Eval Suite]] · [[Scoreboard]] · [[Home]]

#eval #tool
