"""Real TRIZ reframing backed by the pytriz package (github.com/mmysior/pytriz).

Uses `TRIZStore()` in its zero-config offline mode (BM25 lexical search — no API key,
no embeddings), so it runs on Cloud Run with no external services:
  1. BM25-search the problem text against the 39 TRIZ engineering parameters,
  2. pick an improving + a preserving parameter (prefer a pair with a populated
     contradiction-matrix cell),
  3. return the real Inventive Principles from that matrix cell.

pytriz is imported lazily so `import ai.solver` still works where pytriz isn't
installed (the stdlib parts + SCAMPER don't need it)."""

from __future__ import annotations

import asyncio
from functools import lru_cache


@lru_cache(maxsize=1)
def _store():
    from pytriz import TRIZStore  # lazy: only when the TRIZ path is exercised
    return TRIZStore()  # builds the BM25 index once


def triz_contradiction(title: str, statement: str, top_k: int = 5) -> dict:
    """Reframe the problem as a real TRIZ technical contradiction + principles."""
    store = _store()
    text = f"{title}. {statement}".strip()
    params = asyncio.run(store.search_parameters(text, top_k=top_k))

    if not params:
        return {
            "improving": "unmapped parameter",
            "preserving": "unmapped parameter",
            "summary": "TRIZ: no engineering parameter matched the problem text.",
            "principles": [],
        }

    improving = params[0]
    preserving = params[1] if len(params) > 1 else params[0]
    principles: list = []
    # Prefer a preserving parameter whose matrix cell actually yields principles.
    for cand in params[1:]:
        pr = store.get_principles_from_matrix(
            improving_parameters=[improving.id], preserving_parameters=[cand.id]
        )
        if pr:
            preserving, principles = cand, pr
            break
    if not principles and len(params) > 1:
        principles = store.get_principles_from_matrix(
            improving_parameters=[improving.id], preserving_parameters=[preserving.id]
        )

    return {
        "improving": improving.name,
        "preserving": preserving.name,
        "improving_id": improving.id,
        "preserving_id": preserving.id,
        "summary": (
            f"TRIZ: improve '{improving.name}' (#{improving.id}) without worsening "
            f"'{preserving.name}' (#{preserving.id})."
        ),
        "principles": [{"id": p.id, "name": p.name} for p in principles[:5]],
    }
