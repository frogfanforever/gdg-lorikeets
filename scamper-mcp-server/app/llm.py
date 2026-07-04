"""Minimal LLM client — Gemini via its OpenAI-compatible chat endpoint.

Returns "" when no API key is configured, so callers can fall back to a
deterministic stub (keeps the server runnable offline / without a key)."""

import logging

import httpx

from app.core.config import config

log = logging.getLogger("scamper.llm")


def complete(system: str, user: str, temperature: float = 0.7) -> str:
    if not config.SCAMPER_LLM_API_KEY:
        return ""  # signal: no key → caller uses stub
    try:
        resp = httpx.post(
            f"{config.SCAMPER_LLM_BASE_URL.rstrip('/')}/chat/completions",
            headers={"Authorization": f"Bearer {config.SCAMPER_LLM_API_KEY}"},
            json={
                "model": config.SCAMPER_LLM_MODEL,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
                "temperature": temperature,
            },
            timeout=30.0,
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"] or ""
    except Exception as e:  # network/quota/parse — degrade to stub
        log.warning("LLM call failed (%s); falling back to stub", e)
        return ""
