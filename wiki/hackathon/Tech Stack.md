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
| Data | **SQL** + **Sequelize** | Day 4 | relational layer |
| Data | **Cloud SQL** | Day 5 | managed on GCP |
| AI | **Gemini** | Day 4, 5 | core LLM |
| AI | **MCP servers** | Day 2, 5 | design→product + tools |
| AI | **Chrome DevTools MCP** | Day 3 | AI-assisted debugging |
| AI | **Autonomous agentic loops** | Day 4 | self-directing agents |
| AI | **Evaluation scoreboards** | Day 4 | score LLM output quality |
| AI | **pytriz** | Day 5 | technical problem-solving |
| Cloud | **Cloud Run** | Day 5 | deploy target |
| Cloud | **Cloud Build / Artifact Registry** | Day 5 | CI/CD |

## Reference architecture
```
Angular (Nx, signals, ng-diagram)
        │ HTTP
NestJS API + Sequelize  ──►  Cloud SQL
        │
MCP server(s) ◄──► Gemini + autonomous agentic loop
        │
Evaluation scoreboard  (proves output quality to judges)
        │
deployed via Cloud Build → Cloud Run (CI/CD, Artifact Registry)
```

## Process methods (Day 1–2) — name them in the pitch
Design Thinking · SDLC · BPMN · Event Storming · Kanban · digital accessibility ·
AI-powered design systems. Naming these signals full-lifecycle fluency — the
"cross-functional Product Creator" thesis.

## How the evals exercise the stack
Angular quality (pillar 3) → [[WCS]] (fullRatings). Fullstack/backend (pillar 4) →
[[API Acceptance Eval]]. Evaluation scoreboards are literally what we build →
[[Eval Suite]].

See also: [[Judging Criteria]] · [[Winning Playbook]] · [[Home]]

#tech
