"""Core contracts for the inventive-problem solver.

The pipeline (see pipeline.py) is a chain of **real, inspectable steps** — reformulate
-> generate (per method) -> evaluate -> select -> reasoning trail — not one prompt
dressed up. Concept-generation methods are **pluggable strategies**: TRIZ is mandatory
(triz.py), and a second method (scamper.py) plugs in beside it via the registry, so
the hackathon's "≥2 methods, one MUST be TRIZ" requirement is structural, not ad hoc.

Pure stdlib. The only non-deterministic seam is `LLM` (creative text); everything
else — iteration over methods/lenses, scoring, selection — is deterministic code.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Callable, Protocol, runtime_checkable

# A single LLM turn: prompt in, text out. Swap in Gemini/Vertex/ADK; default is an
# offline deterministic stub (see stub_llm) so the pipeline runs and tests without keys.
LLM = Callable[[str], str]


@dataclass(frozen=True)
class Problem:
    """An assigned inventive problem (one of the 7 UN-SDG challenges)."""
    id: str
    title: str
    statement: str
    sdg: str | None = None


@dataclass(frozen=True)
class Contradiction:
    """The problem reframed as a technical contradiction: improving X worsens Y."""
    improving: str      # the parameter we want to improve
    preserving: str     # the parameter that must not get worse
    summary: str        # one-line human-readable framing


@dataclass
class Candidate:
    """One candidate solution, tagged with the method + sub-step that produced it."""
    method: str         # e.g. "triz" | "scamper"
    lens: str           # sub-step: SCAMPER verb, or TRIZ principle "id:name"
    idea: str           # the concrete proposal
    rationale: str      # why it addresses the problem / resolves the contradiction

    @property
    def key(self) -> tuple[str, str]:
        return (self.method, self.lens)


@runtime_checkable
class ConceptGenerationMethod(Protocol):
    """A pluggable idea-generation strategy. Implementations live in their own module
    and self-register via @register."""
    name: str

    def generate(
        self, problem: Problem, contradiction: Contradiction, llm: LLM, n: int = 3
    ) -> list[Candidate]:
        """Return >= n candidates for the problem/contradiction."""
        ...


# --- method registry (swap the second method with one line) -----------------------
_METHODS: dict[str, ConceptGenerationMethod] = {}


def register(method: ConceptGenerationMethod) -> ConceptGenerationMethod:
    _METHODS[method.name] = method
    return method


def get(name: str) -> ConceptGenerationMethod:
    if name not in _METHODS:
        raise KeyError(f"unknown method {name!r}; available: {sorted(_METHODS)}")
    return _METHODS[name]


def available() -> list[str]:
    return sorted(_METHODS)


# --- LLM helpers ------------------------------------------------------------------
def parse_json_object(text: str) -> dict:
    """Best-effort extraction of a single JSON object from an LLM reply."""
    text = text.strip()
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end != -1 and end > start:
        try:
            return json.loads(text[start : end + 1])
        except ValueError:
            pass
    return {}


def stub_llm(prompt: str) -> str:
    """Deterministic offline stand-in for a real LLM. Returns a JSON object echoing
    the lens + problem so the pipeline produces readable, repeatable output without an
    API key. Replace with a Gemini/ADK-backed callable in production."""
    lens = _tag(prompt, "LENS")
    title = _tag(prompt, "PROBLEM") or "the problem"
    if lens:
        return json.dumps({
            "idea": f"[{lens}] transformation applied to {title}",
            "rationale": f"Applying the {lens} lens targets the contradiction without "
                         f"regressing the preserved parameter.",
        })
    if "CONTRADICTION" in prompt:  # reformulate step
        return json.dumps({
            "improving": "primary objective of the problem",
            "preserving": "the constraint that must not worsen",
            "summary": f"Improve the goal of {title} without worsening its key constraint.",
        })
    return json.dumps({"idea": f"generic idea for {title}", "rationale": "n/a"})


def _tag(prompt: str, tag: str) -> str:
    """Pull the first line's value after `TAG:` from a prompt (used only by stub_llm)."""
    for line in prompt.splitlines():
        s = line.strip()
        if s.upper().startswith(tag + ":"):
            return s.split(":", 1)[1].strip()
    return ""
