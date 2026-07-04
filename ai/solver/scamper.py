"""SCAMPER — the second concept-generation method (beside mandatory TRIZ).

Why SCAMPER as the second method:
- **Complementary to TRIZ.** TRIZ resolves a *contradiction* via the matrix +
  Inventive Principles. SCAMPER instead sweeps **seven fixed transformation lenses**
  over the problem — a different cognitive angle, so the two methods produce genuinely
  different candidates (good for the Innovation score, and for evaluation to choose
  between).
- **Inspectable, not one prompt.** Each lens is its own generation step with its own
  prompt and structured output; the reasoning trail shows all seven. The iteration is
  deterministic code — only the idea text comes from the LLM.
- **Guarantees ≥3 candidates.** Seven lenses → up to seven candidates.

To swap SCAMPER for another method (morphological analysis, biomimicry,
first-principles…), implement `ConceptGenerationMethod` in a new module, `@register`
it, and reference its `.name` in the pipeline — nothing else changes.
"""

from __future__ import annotations

from .base import (
    LLM,
    Candidate,
    Contradiction,
    Problem,
    parse_json_object,
    register,
)

# The seven SCAMPER lenses, each with a hint that steers generation.
LENSES: dict[str, str] = {
    "Substitute": "Replace a component, material, energy source, or rule with an alternative.",
    "Combine": "Merge with another product, function, or process step to create synergy.",
    "Adapt": "Borrow a mechanism from another domain/nature that already solves this.",
    "Modify": "Magnify, minify, or change an attribute — scale, geometry, timing, frequency.",
    "Put to another use": "Repurpose the thing, a by-product, or a waste stream elsewhere.",
    "Eliminate": "Remove a part, step, or constraint; simplify to the essential function.",
    "Reverse": "Invert the order, roles, or the problem itself; do the opposite.",
}


def _prompt(problem: Problem, contradiction: Contradiction, lens: str, hint: str) -> str:
    # Tag lines (PROBLEM/LENS/…) let the offline stub echo readable output; a real LLM
    # just reads them as context.
    return (
        "You are generating one concrete engineering solution using a single SCAMPER lens.\n"
        f"PROBLEM: {problem.title}\n"
        f"STATEMENT: {problem.statement}\n"
        f"CONTRADICTION: improve '{contradiction.improving}' without worsening "
        f"'{contradiction.preserving}'.\n"
        f"LENS: {lens} — {hint}\n"
        "Return a JSON object: {\"idea\": <one concrete proposal>, "
        "\"rationale\": <why it fits the problem and does not worsen the preserved parameter>}."
    )


class ScamperMethod:
    name = "scamper"

    def generate(
        self, problem: Problem, contradiction: Contradiction, llm: LLM, n: int = 3
    ) -> list[Candidate]:
        candidates: list[Candidate] = []
        for lens, hint in LENSES.items():
            reply = llm(_prompt(problem, contradiction, lens, hint))
            obj = parse_json_object(reply)
            idea = (obj.get("idea") or reply).strip()
            rationale = (obj.get("rationale") or "").strip()
            if idea:
                candidates.append(
                    Candidate(method=self.name, lens=lens, idea=idea, rationale=rationale)
                )
        # Seven lenses already satisfy n>=3; if a caller asks for more we still cap at
        # the fixed lens set (SCAMPER has exactly seven).
        return candidates


register(ScamperMethod())
