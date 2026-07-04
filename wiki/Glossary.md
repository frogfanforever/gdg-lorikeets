---
tags: [reference, glossary]
---

# Glossary

Terms and tools across the wiki. See [[Home]] for the map.

- **[[Criterion Zero]]** — the pass/fail gate in the [[Judging Criteria]]; the app
  must actually solve its assigned task.
- **fullRatings** — the complete [[WCS]] rating set (all Angular ratings + axe +
  build); wired into stage 9.
- **MCP** — Model Context Protocol; servers that expose tools to an LLM/agent. Part
  of the [[Tech Stack]] and how the Discord intel was read.
- **Nx** — monorepo build system for the Angular/NestJS workspace ([[Tech Stack]]).
- **NestJS** — Node backend framework (pillar 4); see [[API Acceptance Eval]].
- **Sequelize** — ORM over SQL/Postgres used by the nan-stack backend.
- **Gemini** — Google's LLM; the model behind WCS runs and the product's AI.
- **agentic loop** — an autonomous write→verify→fix cycle (Day 4; WCS stage 9).
- **evaluation scoreboard** — measuring AI output quality; our [[Eval Suite]] and
  [[Scoreboard]].
- **WCS** — [[WCS|web-codegen-scorer]], deterministic 0–100 scoring of AI web code.
- **Cloud Run** — Google's serverless container platform; the deploy target
  (pillar 5, [[Tech Stack]]).
- **A11Y** — accessibility; a full 20-pt pillar (Day 2) and the axe gate in [[WCS]].
- **Client + Investor** — the roles the panel plays when judging ([[Judging Criteria]]).
- **[[Event Storming]]** — Day-1 domain-modelling with coloured stickies: a timeline
  of **domain events** (past tense) enriched with commands, actors, policies,
  read models, and **hotspots**.
- **domain event** — in [[Event Storming]], a past-tense fact ("Contradiction
  Identified") on the orange backbone.
- **hotspot** — a red Event Storming sticky: a conflict, risk, or open question to
  capture (not solve) — often becomes an [[Eval Suite]] check.
- **aggregate** — a consistency boundary that handles commands and emits events; the
  Software-Design output of [[Event Storming]] that maps to a service/module.
- **TRIZ** — Theory of Inventive Problem Solving; the app's solution *criterion*
  (39 parameters → contradiction matrix → Inventive Principles), via the
  [[MCP Server|TRIZ MCP server]].

#reference
