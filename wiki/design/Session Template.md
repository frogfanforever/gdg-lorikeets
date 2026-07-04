---
tags: [design, event-storming, template]
aliases: [ES Session Template]
---

# Session Template

Copy this note per Event Storming session (rename to `ES YYYY-MM-DD — <scope>`).
Method + legend live in [[Event Storming]]; model on
[[Event Storming — TRIZ Solver.canvas|the board]].

---

## Session: `<scope in one sentence>`
- **Date:** YYYY-MM-DD
- **Level:** Big Picture · Process Modelling · Software Design
- **Participants:** (UI/UX · Developer · DevOps — the cross-functional trio)
- **Facilitator:**
- **Canvas:** [[Event Storming — TRIZ Solver.canvas]]

### 1. Pivotal events (the spine)
> The 3–6 events that define the story, in order.
1.
2.
3.

### 2. Backbone — timeline of domain events (past tense)
| # | 🟧 Domain Event | 🟦 Command | 🟨 Actor | 🟪 Policy (whenever→) | 🩷 External / 🟩 Read model |
|---|-----------------|-----------|----------|-----------------------|-----------------------------|
| 1 |  |  |  |  |  |
| 2 |  |  |  |  |  |

### 3. 🟥 Hotspots (don't solve — capture)
- [ ]
- [ ]

### 4. Aggregates & bounded contexts
- **Aggregate:** `<noun>` — handles: `<commands>` → emits: `<events>`
- **Bounded context:** `<name>` → maps to service/module on [[Tech Stack]]

### 5. Harvest → decisions
- **MVP slice** (thinnest end-to-end path):
- **Open questions** (→ track / turn into [[Eval Suite]] checks):
- **New glossary terms** (→ [[Glossary]]):
- **Next session:**

See also: [[Event Storming]] · [[Home]]

#design #event-storming #template
