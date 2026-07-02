# Required Tech Stack — Build with AI 2026

The judges taught this stack all week. Using it is not optional — it *is* the
scoring rubric in disguise. Map every part of the demo onto a taught layer.

## Layers

| Layer      | Technology                          | Taught on | Notes                                        |
|------------|-------------------------------------|-----------|----------------------------------------------|
| Frontend   | **Angular** (signals)               | Day 3, 4  | Modern signal-based Angular                   |
| Frontend   | **Nx monorepo**                     | Day 3     | Single repo, multiple apps/libs               |
| Frontend   | **ng-diagram**                      | Day 3     | Native diagramming in Angular                 |
| Backend    | **NestJS**                          | Day 4     | Connected to the Angular frontend             |
| Backend    | **Docker**                          | Day 4     | Containerized services                        |
| Data       | **SQL** + **Sequelize ORM**         | Day 4     | Relational data layer                         |
| Data       | **Cloud SQL**                       | Day 5     | Managed SQL on Google Cloud                   |
| AI / Agents| **Gemini**                          | Day 4, 5  | Core LLM                                       |
| AI / Agents| **MCP servers**                     | Day 2,5   | Design→product + tool integration             |
| AI / Agents| **Chrome DevTools MCP**             | Day 3     | AI-assisted debugging                         |
| AI / Agents| **Autonomous agentic loops**        | Day 4     | Self-directing agents                         |
| AI / Agents| **Evaluation scoreboards**          | Day 4     | Measure/score LLM output quality              |
| AI / Agents| **pytriz** package                  | Day 5     | Technical problem-solving integration         |
| Cloud      | **Google Cloud Run**                | Day 5     | Deploy target                                 |
| Cloud      | **Cloud Build / Artifact Registry** | Day 5     | CI/CD pipeline                                |

## Reference architecture (assemble from the taught layers)

```
[ Angular (Nx, signals, ng-diagram) ]
             │ HTTP
[ NestJS API + Sequelize ]  ──►  [ Cloud SQL ]
             │
[ MCP server(s) ] ◄──► [ Gemini + autonomous agentic loop ]
             │
[ Evaluation scoreboard ]  (proves output quality to judges)
             │
   deployed via Cloud Build → Cloud Run (CI/CD, Artifact Registry)
```

## Process methods taught (Day 1–2) — reference in the pitch
Design Thinking · SDLC · BPMN · Event Storming · Kanban · digital accessibility ·
AI-powered design systems. Naming these in the pitch signals full-lifecycle
fluency, which is exactly the "cross-functional Product Creator" thesis.
