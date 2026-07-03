---
tags: [hackathon, tech]
aliases: [Stack, Required Stack]
---

# Tech Stack

The stack taught across the week. Using it is not optional — it **is the
[[Judging Criteria]] in disguise**, since [[People|the judges are the trainers]].
Map every part of the demo onto a taught layer.

## Layers
| Layer | Technology | Taught | Notes |
|-------|-----------|--------|-------|
| Frontend | **Angular** (signals) | Day 3, 4 | modern signal-based |
| Frontend | **Nx monorepo** | Day 3 | apps + libs |
| Frontend | **ng-diagram** | Day 3 | native Angular diagramming |
| Backend | **NestJS** | Day 4 | wired to Angular |
| Backend | **Docker** | Day 4 | containerized |
| Data | **SQL** + **Sequelize** | Day 4 | relational layer (taught) |
| Data | **Prisma** + **Postgres** | Day 5 | ORM in the gcp-deploy reference |
| Data | **Cloud SQL** | Day 5 | managed Postgres on GCP |
| AI | **Gemini** (2.5-flash) | Day 4, 5 | core LLM |
| AI | **Google ADK + Vertex AI** | Day 5 | agent orchestration (`McpToolset`) |
| AI | **MCP servers** | Day 2, 5 | design→product + tools |
| AI | **Chrome DevTools MCP** | Day 3 | AI-assisted debugging |
| AI | **Autonomous agentic loops** | Day 4 | self-directing agents |
| AI | **Evaluation scoreboards** | Day 4 | score LLM output quality |
| AI | **pytriz** | Day 5 | technical problem-solving |
| Cloud | **Cloud Run** | Day 5 | deploy target (4 services) |
| Cloud | **Cloud Build / Artifact Registry** | Day 5 | CI/CD (`cloudbuild.yaml`) |
| Cloud | **Nginx** | Day 5 | serves the Angular build |

## Reference architecture
Mirrors the workshop's `gcp-deploy` branch — see [[GCP Deployment]].
```
Angular (Nx, signals, ng-diagram) ── Nginx        Cloud Run
        │ HTTP /api/solve
NestJS API + Prisma  ──►  Cloud SQL (Postgres)     Cloud Run
        │
Google ADK agent (Gemini 2.5-flash, Vertex AI)     Cloud Run
        │ McpToolset · Streamable HTTP
MCP server (FastMCP + pytriz)                       Cloud Run
        │
Evaluation scoreboard  (proves output quality to judges)
        │
deployed via Cloud Build → Artifact Registry → Cloud Run (CI/CD, Makefile)
```
> The reference migrated **Sequelize→Prisma** and added a **Google ADK** agent
> tier; the taught Day-4 stack (Sequelize) still satisfies rubric `p4.2`.

## Process methods (Day 1–2) — name them in the pitch
Design Thinking · SDLC · BPMN · Event Storming · Kanban · digital accessibility ·
AI-powered design systems. Naming these signals full-lifecycle fluency — the
"cross-functional Product Creator" thesis.

## How the evals exercise the stack
Angular quality (pillar 3) → [[WCS]] (fullRatings). Fullstack/backend (pillar 4) →
[[API Acceptance Eval]]. Live deployment (pillar 5, p5.1) →
[[Deploy Reachability Eval]]; MCP server (pillar 5, p5.3) →
[[MCP Acceptance Eval]] against the [[MCP Server|TRIZ MCP server]]. Evaluation
scoreboards are literally what we build → [[Eval Suite]].

See also: [[Judging Criteria]] · [[Winning Playbook]] · [[Home]]

#tech
