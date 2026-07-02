---
tags: [hackathon, tech]
aliases: [Stack, Required Stack]
---

# Tech Stack

The stack taught across the week — and, because [[People|the judges are the
trainers]], effectively the [[Judging Criteria]] in disguise. Source:
`ai/context/hackathon/tech-stack.md`.

| Layer | Tech | Day |
|-------|------|-----|
| Frontend | **Angular** (signals), **Nx** monorepo, **ng-diagram** | 3, 4 |
| Backend | **NestJS**, **Docker** | 4 |
| Data | **SQL** + **Sequelize**, **Cloud SQL** | 4, 5 |
| AI / agents | **Gemini**, **MCP servers**, Chrome DevTools MCP, autonomous agentic loops, **evaluation scoreboards**, `pytriz` | 2, 4, 5 |
| Cloud | **Cloud Run**, Cloud Build, Artifact Registry (CI/CD) | 5 |

## Reference architecture
```
Angular (Nx, signals) → NestJS (+ Sequelize) → Cloud SQL
                           ↕
        MCP server ↔ Gemini + agentic loop
                           ↓
     evaluation scoreboard → deployed on Cloud Run (CI/CD)
```

## How the evals exercise the stack
- **Angular quality** (pillar 3) → graded deterministically by [[WCS]] (fullRatings).
- **Fullstack/backend** (pillar 4) → measured by the [[API Acceptance Eval]].
- **Evaluation scoreboards** are literally what we build → see [[Eval Suite]].

See also: [[Judging Criteria]] · [[Winning Playbook]] · [[Home]]

#tech
