---
tags: [eval, tool]
aliases: [mcp_eval, triz-mcp]
---

# MCP Acceptance Eval

Measures the **MCP server** (pillar 5, check `p5.3`) against a running server over
**Streamable HTTP** — best-matched to the Day-5 **[[MCP Server|TRIZ MCP server]]**
(FastMCP + `pytriz`).

> 📄 **Canonical:** `ai/evals/datasets/triz-mcp/README.md` (+ `mcp-cases.jsonl`,
> runner `ai/evals/mcp_eval.py`).

- A stdlib MCP client does the `initialize` handshake, checks `tools/list`
  registers all **6 TRIZ tools**, then runs **10 tool-call cases** (id lookups,
  out-of-range error, random, contradiction matrix, 2 semantic searches).
- Tool responses are text → expectations are `contains` / `not_contains` /
  `is_error` substring checks. The 2 `search_*` cases are `needs_embeddings` and
  skipped unless `--include-embeddings` (they need the Ollama backend up).
- Maps pass-rate → `p5.3`; `--merge` into `scores.json`, then run the
  [[Scoreboard]]. Offline `--dry-run` validates the dataset; `--gate` exits
  non-zero on any failure (drop-in CI / pre-commit gate). Point `--url` at the
  deployed Cloud Run endpoint for the highest-signal run.

See also: [[Eval Suite]] · [[API Acceptance Eval]] · [[WCS]] · [[MCP Server]] · [[Home]]

#eval #tool
