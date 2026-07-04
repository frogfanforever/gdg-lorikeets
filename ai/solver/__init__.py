"""Inventive-problem solver: pluggable concept-generation over a real, inspectable
pipeline. Importing the package registers the built-in methods (TRIZ + SCAMPER)."""

from . import scamper, triz  # noqa: F401  (import side-effect: registers the methods)
from .base import (
    Candidate,
    ConceptGenerationMethod,
    Contradiction,
    LLM,
    Problem,
    available,
    get,
    register,
    stub_llm,
)
from .pipeline import ReasoningTrail, reformulate, solve

__all__ = [
    "Problem", "Contradiction", "Candidate", "ConceptGenerationMethod", "LLM",
    "register", "get", "available", "stub_llm",
    "solve", "reformulate", "ReasoningTrail",
]
