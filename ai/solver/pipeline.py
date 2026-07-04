"""The solver pipeline: the inspectable chain that IS the deliverable.

Steps map 1:1 onto the Event Storming backbone (wiki/design/Event Storming — TRIZ
Solver.canvas):
  Problem Assigned -> Problem Reformulated as Contradiction -> Generation Methods
  Selected -> Candidate Solutions Generated (per method) -> Candidates Evaluated ->
  Solution Selected -> Reasoning Trail Presented.

Each step is real logic that can be inspected/tested independently. Methods are
resolved from the registry by name, so the "≥2 methods, one MUST be TRIZ" rule is
enforced here in code, not by prompt.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from . import base
from .base import LLM, Candidate, Contradiction, Problem, parse_json_object, stub_llm
from .evaluate import WEIGHTS, Score, default_evaluator


def reformulate(problem: Problem, llm: LLM) -> Contradiction:
    """Reframe the problem as a technical contradiction (improving X worsens Y)."""
    prompt = (
        "Reframe this problem as a single technical CONTRADICTION.\n"
        f"PROBLEM: {problem.title}\nSTATEMENT: {problem.statement}\n"
        "Return JSON: {\"improving\": <parameter to improve>, "
        "\"preserving\": <parameter that must not worsen>, \"summary\": <one line>}."
    )
    obj = parse_json_object(llm(prompt))
    return Contradiction(
        improving=obj.get("improving", "the objective"),
        preserving=obj.get("preserving", "the key constraint"),
        summary=obj.get("summary", f"Improve {problem.title} without worsening its constraint."),
    )


@dataclass
class ReasoningTrail:
    """The full, presentable trail: problem -> contradiction -> candidates ->
    evaluation -> choice."""
    problem: Problem
    contradiction: Contradiction
    candidates: list[Candidate]
    scores: list[Score]
    choice: Score
    methods: list[str] = field(default_factory=list)

    def render(self) -> str:
        lines = [
            f"# Reasoning trail — {self.problem.title}"
            + (f"  ({self.problem.sdg})" if self.problem.sdg else ""),
            "",
            "## 1. Problem",
            self.problem.statement,
            "",
            "## 2. Contradiction",
            f"Improve **{self.contradiction.improving}** without worsening "
            f"**{self.contradiction.preserving}**.",
            f"_{self.contradiction.summary}_",
            "",
            f"## 3. Candidates ({len(self.candidates)} via {', '.join(self.methods)})",
        ]
        ranked = sorted(self.scores, key=lambda s: s.total, reverse=True)
        for s in ranked:
            c = s.candidate
            crit = " ".join(f"{k}={v}" for k, v in s.criteria.items())
            lines.append(f"- **[{c.method}/{c.lens}]** {c.idea}  \n"
                         f"  score **{s.total}** ({crit}) — {s.notes}")
        lines += [
            "",
            "## 4. Evaluation",
            "Weighted rubric: " + ", ".join(f"{k} {int(w*100)}%" for k, w in WEIGHTS.items()),
            "",
            "## 5. Choice",
            f"**[{self.choice.candidate.method}/{self.choice.candidate.lens}]** "
            f"{self.choice.candidate.idea}  \n"
            f"Chosen at score **{self.choice.total}** — highest overall; "
            f"{self.choice.notes}.",
        ]
        return "\n".join(lines)


def solve(
    problem: Problem,
    method_names: list[str] | None = None,
    llm: LLM = stub_llm,
    per_method: int = 3,
    evaluator=default_evaluator,
) -> ReasoningTrail:
    """Run the full pipeline. `method_names` defaults to every registered method and
    MUST include 'triz'."""
    names = method_names or base.available()
    if "triz" not in names:
        raise ValueError("TRIZ is mandatory: 'triz' must be among the methods.")

    contradiction = reformulate(problem, llm)

    candidates: list[Candidate] = []
    for name in names:
        candidates.extend(base.get(name).generate(problem, contradiction, llm, n=per_method))

    scores = evaluator(problem, contradiction, candidates)
    if not scores:
        raise RuntimeError("no candidates generated")
    choice = max(scores, key=lambda s: s.total)
    return ReasoningTrail(problem, contradiction, candidates, scores, choice, methods=names)
