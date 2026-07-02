# Eval 01 — Product Design & MVP (Day 1)

**Rubric id:** `p1` · **Type:** scored · **Max:** 20 pts · **Judge:** Dawid Perdek

## Checks
| id | check | pts |
|----|-------|-----|
| p1.1 | Concrete **user persona** defined | 4 |
| p1.2 | Sharp, real **problem statement** | 4 |
| p1.3 | **MVP scope** tight; core flow mapped, no scope creep | 4 |
| p1.4 | **Process artifacts** (Design Thinking / BPMN / Event Storming / Kanban) | 4 |
| p1.5 | MVP **delivers the core user flow end-to-end** | 4 |

## Evidence to collect
- One-page persona (goals, pains, context).
- Problem statement in "As a … I need … so that …" form.
- Core-flow diagram (BPMN / Event Storming board) and a Kanban snapshot.
- A recorded end-to-end run of the primary flow.

## LLM-judge prompt
```
Act as a product design judge. Score each check p1.1–p1.5 from 0..1 (fraction of
the points earned). Reward specificity and evidence; penalize generic personas,
vague problems, and scope creep. EVIDENCE: <paste artifacts/links>.
Return JSON {"p1.1":0..1, ..., "notes":"..."}.
```

## Cheap points most teams miss
- Showing the **BPMN / Event Storming** artifact explicitly (p1.4) — few will.
- Naming the Day-1 methods in the pitch signals full-lifecycle fluency to Perdek.
