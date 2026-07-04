# 🧩 Inventive-Problem Solver

Scaffold for the assigned hackathon task (`wiki/hackathon/Hackaton task.md`): take an
inventive problem → reframe as a **technical contradiction** → generate candidates
with **≥2 concept-generation methods (TRIZ mandatory + a second)** → **evaluate** all
candidates → **select** one → present the full **reasoning trail**. Every step is
**real, inspectable logic**, not one prompt dressed up.

## Why this shape
The judges explicitly reward *real, inspectable logic* and *Innovation* (25 pts, the
biggest bucket). So methods are **pluggable strategies** behind one contract, and the
pipeline (not a prompt) enforces the flow.

```
ai/solver/
  base.py       Problem/Contradiction/Candidate, the ConceptGenerationMethod protocol,
                the method registry, and an offline stub LLM.
  triz.py       TRIZ (mandatory) — adapter over the TRIZ MCP browse_contradiction_matrix
                tool (inject a principles_provider). One Inventive Principle → one candidate.
  scamper.py    SCAMPER (the second method) — 7 fixed transformation lenses → candidates.
  evaluate.py   Deterministic rubric evaluator (resolves_contradiction/feasibility/
                impact/novelty) — inspectable scoring, swappable for an LLM judge.
  pipeline.py   solve(): reformulate → generate per method → evaluate → select → trail.
  demo.py       Runnable end-to-end example on an SDG problem (offline).
```

The five pipeline steps map 1:1 onto the **Event Storming** backbone
(`wiki/design/Event Storming — TRIZ Solver.canvas`).

## Run it
```bash
python -m ai.solver.demo      # offline: stub LLM + stub TRIZ provider, prints the trail
```

## The second method: SCAMPER (and how to swap it)
SCAMPER sweeps seven transformation lenses (Substitute, Combine, Adapt, Modify, Put to
another use, Eliminate, Reverse) — a different angle from TRIZ's contradiction matrix,
so the two methods yield genuinely different candidates. Each lens is its own
inspectable generation step (→ up to 7 candidates, ≥3 guaranteed).

To swap SCAMPER for another method (morphological analysis, biomimicry,
first-principles…): implement the `ConceptGenerationMethod` protocol in a new module,
`register(YourMethod())`, and list its `.name` in `solve(method_names=[...])`. Nothing
else changes — TRIZ stays mandatory (the pipeline enforces it).

## Wiring real components (production)
- **LLM:** pass a callable `(prompt:str)->str` backed by Gemini/Vertex/ADK as `solve(..., llm=...)`.
- **TRIZ:** `base.get("triz").with_provider(fn)` where `fn(improving, preserving)`
  calls the TRIZ MCP `browse_contradiction_matrix` tool (see `wiki/integrations/MCP Server.md`).
- **Evaluator:** pass `solve(..., evaluator=...)` to use an LLM judge instead of the
  deterministic rubric.

See `wiki/design/Concept Generation Methods.md` for the design rationale.
