"""End-to-end demo on a sample SDG problem, using the offline stub LLM + a stub TRIZ
principles provider, so it runs with zero setup:

    python -m ai.solver.demo

Wire real components for production: pass an LLM callable backed by Gemini/ADK, and
`triz.TrizMethod().with_provider(<MCP browse_contradiction_matrix call>)`.
"""

from __future__ import annotations

from . import base, triz
from .pipeline import solve
from .base import Problem

# Sample assigned problem (Hackaton task, Problem 1).
EWASTE = Problem(
    id="p1",
    title="Reducing the volume of electronic waste",
    sdg="SDG 12",
    statement=(
        "Devices are made affordable, compact and quick to produce, which shapes "
        "assembly and materials. Only a small fraction of e-waste is safely recovered; "
        "the rest leaks toxins and loses rare earths, copper and gold. Increase safe, "
        "effective material recovery — while people still upgrade phones yearly."
    ),
)


def _stub_principles(improving: str, preserving: str) -> list[dict]:
    """Stand-in for the TRIZ MCP browse_contradiction_matrix tool."""
    return [
        {"id": 1, "name": "Segmentation",
         "application": "Design devices as snap-apart modules so recyclers separate "
                        "material streams without shredding."},
        {"id": 2, "name": "Taking out",
         "application": "Extract the high-value board (rare earths/gold) into a single "
                        "easily-removable cartridge collected at trade-in."},
        {"id": 35, "name": "Parameter changes",
         "application": "Use reversible fasteners/adhesives that release with heat so "
                        "disassembly is fast and non-destructive."},
    ]


def main() -> None:
    # Wire the registry's TRIZ method with the stub provider.
    base.get("triz").with_provider(_stub_principles)  # type: ignore[attr-defined]

    trail = solve(EWASTE, method_names=["triz", "scamper"], llm=base.stub_llm)
    print(trail.render())
    print(f"\n[methods={trail.methods}  candidates={len(trail.candidates)}  "
          f"choice={trail.choice.candidate.method}/{trail.choice.candidate.lens}]")


if __name__ == "__main__":
    main()
