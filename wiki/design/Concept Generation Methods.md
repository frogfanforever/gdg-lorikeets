---
tags: [design, ai, solver]
aliases: [Concept Generation, Methods, SCAMPER]
---

# Concept Generation Methods

The [[Hackaton task]] demands **≥2 concept-generation methods** (one **MUST be TRIZ**)
and that every step is **real, inspectable logic — not one prompt dressed up**. So we
build methods as **pluggable strategies** behind one contract, and a pipeline (code,
not a prompt) runs them.

> 📄 **Canonical:** `ai/solver/` (`base.py` contract + registry · `triz.py` ·
> `scamper.py` · `evaluate.py` · `pipeline.py` · `demo.py`). Run `python -m
> ai.solver.demo`.

## Pipeline = the [[Event Storming]] backbone, in code
`reformulate → generate (per method) → evaluate → select → reasoning trail` — the
exact events on [[Event Storming — TRIZ Solver.canvas|the board]]. Each step is
independently inspectable/testable; only candidate *text* comes from the LLM.

## The two methods
- **TRIZ** (mandatory) — reframe as a contradiction, look up the 39-parameter matrix
  via the [[MCP Server|TRIZ MCP server]] (`pytriz`), turn each Inventive Principle
  into a candidate.
- **SCAMPER** (our second method) — seven fixed transformation lenses (Substitute,
  Combine, Adapt, Modify, Put-to-another-use, Eliminate, Reverse). **Why SCAMPER:**
  it's a different cognitive angle from contradiction-solving (so candidates differ →
  better [[Judging Criteria|Innovation]] score and a real choice to evaluate), each
  lens is its own inspectable step, and seven lenses guarantee ≥3 candidates.

**Swappable:** to try morphological analysis / biomimicry / first-principles instead,
implement the `ConceptGenerationMethod` protocol, register it, and name it in
`solve(method_names=[...])`. TRIZ stays mandatory — enforced in the pipeline.

## Evaluation (the "choose one, justify it" requirement)
A deterministic rubric (`evaluate.py`) scores every candidate on
**resolves_contradiction (40%) · feasibility (25%) · impact (20%) · novelty (15%)**
and returns per-criterion numbers, so the reasoning trail shows *why* the winner won.
Swappable for an LLM judge. Deterministic-by-default is our strongest evidence for
[[Criterion Zero]] ("processes the problem correctly and logically").

See also: [[Event Storming]] · [[Hackaton task]] · [[MCP Server]] · [[Tech Stack]] · [[Home]]

#design #ai #solver
