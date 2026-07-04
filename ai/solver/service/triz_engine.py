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


# ---------------------------------------------------------------------------
# Granular TRIZ engine (stateless) — powers the expert step-by-step flow.
# Deterministic/offline: pytriz BM25 + the 39x39 matrix. No LLM/embeddings.
# ---------------------------------------------------------------------------


def _rank_confidence(rank: int) -> float:
    """Rough, deterministic confidence from BM25 rank (pytriz doesn't expose scores)."""
    return round(max(0.4, 0.95 - 0.12 * rank), 2)


def _param_view(p) -> dict:
    return {"id": p.id, "name": p.name, "description": getattr(p, "description", "")}


def list_parameters() -> list[dict]:
    store = _store()
    return [_param_view(store.get_parameter_by_id(i)) for i in range(1, 40)]


def get_parameter(pid: int) -> dict:
    return _param_view(_store().get_parameter_by_id(pid))


def search_parameters(query: str, limit: int = 5) -> list[dict]:
    res = asyncio.run(_store().search_parameters(query, top_k=limit))
    return [{**_param_view(p), "confidence": _rank_confidence(i)} for i, p in enumerate(res)]


def _principle_view(p, full: bool = False) -> dict:
    v = {"id": p.id, "name": p.name}
    if full:
        v.update({
            "description": getattr(p, "description", ""),
            "rules": list(getattr(p, "rules", [])),
            "hints": list(getattr(p, "hints", [])),
            "examples": list(getattr(p, "examples", [])),
        })
    return v


def list_principles() -> list[dict]:
    store = _store()
    return [_principle_view(store.get_principle_by_id(i)) for i in range(1, 41)]


def get_principle(pid: int) -> dict:
    return _principle_view(_store().get_principle_by_id(pid), full=True)


def matrix_cell(improving_id: int, preserving_id: int) -> dict:
    principles = _store().get_principles_from_matrix(
        improving_parameters=[improving_id], preserving_parameters=[preserving_id]
    )
    return {
        "cell": {"improving_id": improving_id, "preserving_id": preserving_id},
        "principles": [{"id": p.id, "name": p.name} for p in principles],
    }


def analyze(title: str, statement: str, top_k: int = 5) -> dict:
    """Suggest an improving + preserving parameter (with alternatives + confidence)."""
    res = asyncio.run(_store().search_parameters(f"{title}. {statement}".strip(), top_k=max(4, top_k)))
    if not res:
        return {"improving": None, "preserving": None}
    v = [{**_param_view(p), "confidence": _rank_confidence(i)} for i, p in enumerate(res)]
    improving = {**v[0], "alternatives": v[1:3]}
    preserving = {**(v[1] if len(v) > 1 else v[0]), "alternatives": v[3:4]}
    return {"improving": improving, "preserving": preserving}


def recommend(improving: str, preserving: str, principle_ids: list[int]) -> dict:
    """Deterministic recommendation tying selected principles to the contradiction.
    (LLM synthesis is the later upgrade behind this same shape.)"""
    store = _store()
    applied = []
    parts = []
    for pid in principle_ids:
        p = store.get_principle_by_id(pid)
        applied.append({"id": p.id, "name": p.name})
        rule = (list(getattr(p, "rules", [])) or [getattr(p, "description", "")])[0]
        parts.append(f"Principle {p.id} ({p.name}): {rule}")
    body = " ".join(parts) if parts else "Select at least one principle."
    text = (
        f"To improve '{improving}' without worsening '{preserving}', apply "
        f"{', '.join(str(a['id']) for a in applied) or '—'}. {body}"
    )
    return {"text": text, "applied_principle_ids": [a["id"] for a in applied], "applied": applied}
