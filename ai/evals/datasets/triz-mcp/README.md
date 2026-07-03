# triz-mcp — MCP acceptance eval dataset

Eval **data** derived from the Day-5 **TRIZ MCP server**
(github.com/mmysior/gdg-mcp-workshop, read 2026-07-03): a
[FastMCP](https://github.com/modelcontextprotocol/python-sdk) server that wraps
[pytriz](https://github.com/mmysior/pytriz) `0.3.0` and exposes TRIZ tools over
**Streamable HTTP** at `/mcp`. Best-matched data for **eval 05 (Deployment/Scale),
check `p5.3`** — "MCP server built and/or integrated" — it measures whether a
running MCP server actually registers its tools and returns correct results.

## The server
Two containers (see the workshop repo):
- `mcp-server/` — FastMCP app (`stateless_http=True`, `json_response=True`),
  listens on `MCP_PORT` (default `8123`), endpoint `POST /mcp`.
- `embeddings/` — Ollama serving `embeddinggemma:300m` for pytriz semantic search.

Six registered tools:

| tool | needs embeddings | what it does |
|------|------------------|--------------|
| `get_principle_by_id(principle_id)` | no | Inventive Principle 1–40 by id |
| `get_parameter_by_id(parameter_id)` | no | engineering parameter 1–39 by id |
| `get_random_principles(limit)` | no | random Inventive Principles |
| `browse_contradiction_matrix(improving_params, preserving_params)` | no | matrix lookup → principles |
| `search_parameter(query, limit)` | **yes** | semantic search over parameters |
| `search_principle(query, limit)` | **yes** | semantic search over principles |

## Files
- `mcp-cases.jsonl` — 10 acceptance cases (id lookups, out-of-range error,
  random, contradiction matrix, 2 semantic searches). The 2 `search_*` cases are
  `needs_embeddings` and skipped unless `--include-embeddings` (they require the
  embeddings container / Ollama up).

Each line:
```json
{"id","evals":["p5","c0"],"desc","tool","args":{...},"needs_embeddings"?,
 "expect":{"contains"?:[...],"not_contains"?:[...],"is_error"?:bool}}
```
Tool responses are plain text, so expectations are substring checks. Before the
cases run, `tools/list` is checked against the 6 expected tools (synthetic case
`tools-registered`).

## Run it
```bash
cd ai/evals
python mcp_eval.py --dry-run                 # validate offline (no server needed)

# with the server up — locally (in the workshop repo's mcp-server/):
#   uv sync && uv run python app/main.py      # or ./local_deploy.sh (Docker)
python mcp_eval.py --url http://localhost:8123/mcp
python mcp_eval.py --include-embeddings       # also exercise semantic search
python mcp_eval.py --merge scores.json        # write the p5.3 rating, then:
python scoreboard.py scores.json

# against a deployed Cloud Run MCP server (highest-signal for judging):
python mcp_eval.py --url https://<service>.run.app/mcp --merge scores.json
```
Smoke-test the UI too with the MCP Inspector (`npx @modelcontextprotocol/inspector`,
Transport = Streamable HTTP, URL = `…/mcp`).

## How it maps to evals
| Rating | Meaning | Derived from |
|--------|---------|--------------|
| `p5.3` | MCP server built and/or integrated | pass-rate of `tools-registered` + every executed tool-call case |

The non-embedding cases (`principle-1`, `parameter-1`, `matrix-weight-vs-speed`)
are the highest-signal: they prove the transport, registration, and pytriz data
path all work without any external service — direct evidence that the MCP
integration is real, and (deployed) that it survives Cloud Run cold-start.
