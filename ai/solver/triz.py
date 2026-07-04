"""TRIZ — the mandatory concept-generation method.

TRIZ turns the contradiction into candidates deterministically: map the free-text
problem to the 39 engineering parameters, look up the contradiction matrix cell for
(improving, preserving), and turn each returned **Inventive Principle** into one
candidate. That lookup is exactly the [[TRIZ MCP server]] (`pytriz`) we already run
— see `ai/evals/wcs`/the workshop repo and `wiki/integrations/MCP Server.md`.

This module is the pluggable adapter: it takes a `principles_provider` — a callable
`(improving, preserving) -> list[{"id","name","description"}]` — so the real logic
(the MCP `browse_contradiction_matrix` tool) is injected, and tests/offline runs pass
a stub. The point of scaffolding it here is **registry parity**: both methods expose
the same `generate()` contract, so the pipeline treats TRIZ and SCAMPER identically.
"""

from __future__ import annotations

from typing import Callable

from .base import LLM, Candidate, Contradiction, Problem, register

# (improving_param, preserving_param) -> list of Inventive Principle dicts.
PrinciplesProvider = Callable[[str, str], list[dict]]


def _unwired(improving: str, preserving: str) -> list[dict]:
    raise RuntimeError(
        "TrizMethod has no principles_provider wired. Inject one backed by the TRIZ "
        "MCP server's browse_contradiction_matrix tool (see wiki/integrations/MCP Server.md)."
    )


class TrizMethod:
    name = "triz"

    def __init__(self, principles_provider: PrinciplesProvider | None = None) -> None:
        # Default registry instance is unwired; pipeline/demo can set a provider
        # (real MCP call, or a stub) via .with_provider().
        self._provider = principles_provider or _unwired

    def with_provider(self, provider: PrinciplesProvider) -> "TrizMethod":
        self._provider = provider
        return self

    def generate(
        self, problem: Problem, contradiction: Contradiction, llm: LLM, n: int = 3
    ) -> list[Candidate]:
        principles = self._provider(contradiction.improving, contradiction.preserving)
        candidates = [
            Candidate(
                method=self.name,
                lens=f"{p.get('id', '?')}:{p.get('name', 'principle')}",
                idea=p.get("application", p.get("description", "")).strip(),
                rationale=f"TRIZ matrix suggests principle {p.get('name')} to resolve "
                          f"'{contradiction.improving}' vs '{contradiction.preserving}'.",
            )
            for p in principles
        ]
        return candidates


register(TrizMethod())
