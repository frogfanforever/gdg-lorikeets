---
tags: [moc, design, event-storming]
aliases: [Event Storming, ES, Domain Model]
---

# Event Storming

Our **Day-1** modelling technique (Product Design, Scope & MVP — see
[[Build with AI 2026]]) and a **graded Day-1 deliverable** (BPMN *or* Event Storming
— [[Hackaton deliverables]], 20 pts). Put the whole team around one wall of sticky
notes and discover the domain as a **timeline of things that happen**, before writing
a line of code. It surfaces the real process, the hard questions (**hotspots**), and
the natural service boundaries — which feed the MVP scope and the [[Tech Stack]].

**Our domain** (the assigned [[Hackaton task]]): an **R&D inventive-problem solver**.
Given an assigned problem (one of 7 UN-SDG challenges), the system reformulates it as
a **technical contradiction**, generates candidate solutions with **at least two
concept-generation methods**, evaluates every candidate against the original problem,
selects one, and presents the full **reasoning trail** (problem → contradiction →
candidates → evaluation → choice). Each step must be **real, inspectable logic**, not
one prompt dressed up to look structured.

> 🔌 **Method-pluggable by design.** **TRIZ** (39 parameters → contradiction matrix →
> Inventive Principles, via the [[MCP Server|TRIZ MCP server]]) is the *mandatory*
> method, but the generation step is a **swappable strategy** — a second method
> (e.g. SCAMPER, morphological analysis, biomimicry, first-principles) plugs in
> beside it. So the backbone says "Candidate Solutions Generated (per method)", never
> "TRIZ queried" — the pipeline runs whatever methods are configured.

> ▶️ **Do it here:** open **[[Event Storming — TRIZ Solver.canvas|the board]]** (an
> Obsidian canvas). It currently holds **only the domain-event backbone** (the
> Big-Picture level). Enrich it (commands, actors, policies…) in later passes using
> the legend below. Capture each session with the [[Session Template]].

## 🎨 Sticky legend
Standard Event Storming colours, and how we map them onto Obsidian canvas colours
(canvas has 6 preset colours, so external systems + aggregates use grey).

| Sticky | Real colour | Canvas | Meaning | Grammar |
|--------|-------------|--------|---------|---------|
| **Domain Event** | 🟧 orange | `2` | a fact that happened | **past tense**: "Contradiction Identified" |
| **Command** | 🟦 blue | `5` | an intent/action that causes an event | **imperative**: "Submit Problem" |
| **Actor / Persona** | 🟨 yellow | `3` | who issues a command | a role: "Engineer" |
| **Policy / Reaction** | 🟪 lilac | `6` | reactive rule | **"whenever X → do Y"** |
| **Read Model / View** | 🟩 green | `4` | info an actor needs to decide | "Recommendations view" |
| **External System** | 🩷 pink | grey | outside service we call | "Gemini / Vertex AI" |
| **Aggregate** | 🟨 pale | grey | consistency boundary that handles commands → emits events | noun: "Problem Session" |
| **Hotspot** | 🟥 red | `1` | conflict, risk, open question | "❓ how to extract params?" |

## 🔭 Three levels (run them in order)
1. **Big Picture** — chaotic exploration: everyone throws **domain events** (orange)
   on the wall, no structure. Then enforce a **timeline** (left→right) and mark
   **hotspots** (red).
2. **Process Modelling** — enrich the backbone: add the **command** that causes each
   event, the **actor** behind it, **policies** ("whenever…"), **external systems**,
   and **read models**.
3. **Software Design** — cluster commands+events into **aggregates**, group into
   **bounded contexts**, which become services/modules on the [[Tech Stack]].

## 🧭 Facilitation checklist
- [ ] Frame the scope in one sentence; write the **pivotal events** first.
- [ ] Chaotic exploration — events only, past tense, no debate (timebox ~15 min).
- [ ] Enforce the timeline; resolve duplicates; mark **hotspots**, don't solve them.
- [ ] Walk it backwards ("what had to happen before this?") to find gaps.
- [ ] Add commands → actors → policies → external systems → read models.
- [ ] Draw **aggregate** boundaries; name **bounded contexts**.
- [ ] Harvest: MVP slice (the thinnest end-to-end path), open questions, glossary
      terms → [[Glossary]].

## ✍️ Our conventions
- Domain events are **past tense**; commands are **imperative**; policies start with
  **"whenever"**. If a sticky doesn't fit the grammar, it's the wrong colour.
- One canvas per scope. Keep the **backbone** (orange events) on a single horizontal
  line; stack commands above, policies/systems/read-models below.
- Every **hotspot** that survives becomes a line in the session's *Open questions*
  and, ideally, a check we can measure in the [[Eval Suite]].

See also: [[Session Template]] · [[Event Storming — TRIZ Solver.canvas|The board]] ·
[[Hackaton task]] · [[Hackaton deliverables]] · [[Tech Stack]] · [[Home]]

#moc #design #event-storming
