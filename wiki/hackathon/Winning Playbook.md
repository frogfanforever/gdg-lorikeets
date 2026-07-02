---
tags: [hackathon, strategy]
aliases: [Strategy, How to Win]
---

# Winning Playbook

How Team Lorikeets take first at [[Build with AI 2026]]. Confirmed against the
official [[Judging Criteria]].

## The core bet — CONFIRMED
**The judges are the trainers ([[People]]), and points split evenly across their
days.** Reward a product that demonstrably uses what each taught. Balance across
all 5 pillars beats specialization — a frontend-only team caps at ~80 and risks
[[Criterion Zero]].

- **Dawid Perdek (Day 1 — Product):** open with a crisp persona + problem + scoped
  MVP; show the BPMN / Event Storming artifact.
- **Adrian Romański (Day 3 — Frontend):** clean Nx monorepo, signal-based Angular,
  ng-diagram used for something real (provable via [[WCS]]).
- **Marek Mysior (Day 5 — Deploy):** live on Cloud Run via CI/CD. A public URL
  beats localhost every time.

## The demo must show all three pillars
1. **Product thinking** — one real user, one real problem, tight scope.
2. **AI-native build** — Gemini + MCP server + agentic loop, with an on-screen
   **evaluation scoreboard** proving output quality (skipping it is disqualifying
   in spirit). See [[Eval Suite]], [[WCS]], [[API Acceptance Eval]].
3. **Real deployment** — Angular (Nx) + NestJS + Cloud SQL, live on Cloud Run.

## Differentiators (map to taught material)
- **[[Criterion Zero]] first** — a working product that solves the assigned task.
- **Evaluation scoreboard** (Day 4) — most teams hand-wave AI quality; we measure it.
- **MCP server** (Day 2 & 5) — expose our own tool, the week's throughline.
- **A11Y** (Day 2) — cheap, high-yield, few bother.

## Time-boxed plan for 4 Jul
1. First 30 min: lock persona + problem + MVP scope (Day 1 method).
2. Scaffold Nx: Angular app + NestJS API + Sequelize/Cloud SQL.
3. Stand up the MCP server + Gemini agent loop early; wire the eval scoreboard.
4. Deploy to Cloud Run on CI/CD by mid-afternoon — deploy once, redeploy often.
5. Last hour: rehearse a 3-pillar pitch (Product → AI → Deploy), name each judge's
   tools/methods.

## Our edge
The repo ships a `.jsonl` ingestion pipeline ([[Discord Integration]]) + an eval
scoreboard — a ready-made data source and eval substrate. Lead the pitch with a
working pipeline, not slideware.

See also: [[Tech Stack]] · [[Judging Criteria]] · [[Home]]

#strategy
