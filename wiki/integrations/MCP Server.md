---
tags: [integration, tool, ai]
aliases: [TRIZ MCP Server, MCP, pytriz]
---

# MCP Server

The **Day-5 deliverable**: a custom **Model Context Protocol** server that gives an
LLM access to external tools — the concrete thing check **`p5.3`** rewards (see
[[Judging Criteria]]). The workshop's reference is a **TRIZ MCP server** that wraps
the [`pytriz`](https://github.com/mmysior/pytriz) package so a model can resolve
technical contradictions with TRIZ's Inventive Principles.

> 📄 **Source:** github.com/mmysior/gdg-mcp-workshop (read 2026-07-03). Local
> copy at `~/gdg-mcp-workshop`. Trainer: Marek Mysior; deploy session: Moksh
> Atukuri, Jacek Kubiak.

## Architecture
Two containers:
- **`mcp-server/`** — a [FastMCP](https://github.com/modelcontextprotocol/python-sdk)
  app (Python 3.13, `pytriz==0.3.0`) served over **Streamable HTTP** at `POST /mcp`.
  Built `stateless_http=True` + `json_response=True` → each request is independent
  and returns plain JSON (no session, no SSE) — which is exactly why a stateless
  eval client can drive it. Default port `8123`.
- **`embeddings/`** — [Ollama](https://ollama.com) serving `embeddinggemma:300m`,
  used by pytriz for the semantic-search tools. On Cloud Run this needs a GPU
  (NVIDIA L4; the Dockerfile pins `ollama/ollama:0.23.4` for L4 compatibility).

> **Branch note:** the above is the `main` branch. On the deployable `gcp-deploy`
> branch the MCP server is **self-contained** — `get_store()` is just
> `TRIZStore()` (no Ollama), so no embeddings container to run — and it's one of
> **4 Cloud Run services**, called by a **Google ADK agent** via `McpToolset`
> (Streamable HTTP). See [[GCP Deployment]].

```
LLM / MCP client ──Streamable HTTP──► FastMCP (/mcp)
                                         │  pytriz TRIZStore
                                         └──► Ollama embeddings (semantic search)
```

## Tools exposed
| tool | needs embeddings |
|------|------------------|
| `get_principle_by_id` · `get_parameter_by_id` | no |
| `get_random_principles` · `browse_contradiction_matrix` | no |
| `search_parameter` · `search_principle` | **yes** (Ollama) |

## Run & connect
```bash
cd mcp-server
uv sync && uv run python app/main.py     # or ./local_deploy.sh (Docker)
# → http://localhost:8123/mcp
npx @modelcontextprotocol/inspector      # Transport: Streamable HTTP, URL: …/mcp
```
LM Studio / clients: add `{"mcpServers":{"triz":{"url":"http://localhost:8123/mcp"}}}`.

## Why it matters for the win
`p5.3` is **4 pts**, and an MCP server is the cleanest way to show the "AI as
collaborative bridge" thesis in the demo: point Gemini (or Claude/LM Studio) at a
tool *we* deployed and watch it solve a real engineering contradiction live.
**Deploy it to Cloud Run** alongside the app so it also feeds `p5.1`/`p5.2` and
[[Criterion Zero]]. We measure it deterministically with the
[[MCP Acceptance Eval]] → `p5.3`.

See also: [[Tech Stack]] · [[GCP Deployment]] · [[Eval Suite]] · [[Discord Integration]] · [[Home]]

#integration #tool #ai
