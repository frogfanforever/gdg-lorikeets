# SCAMPER MCP Server

A second concept-generation MCP server (beside the TRIZ one in `../mcp-server`),
exposing the **SCAMPER** ideation method over Streamable HTTP. Each lens is generated
by an LLM (**Gemini**, via its OpenAI-compatible endpoint); with no API key it falls
back to a deterministic stub so the server still runs.

## Tools
- `list_scamper_lenses()` — the seven lenses + what each prompts.
- `apply_lens(problem, lens)` — one concrete idea via a single lens.
- `scamper_ideate(problem, lenses?)` — one idea per lens (all seven by default).

## Run
```bash
cp .env.example .env    # set SCAMPER_LLM_API_KEY for real ideas (else stub)
uv sync && MCP_HOST=0.0.0.0 MCP_PORT=8000 uv run python app/main.py   # → http://localhost:8000/mcp
```

## Deploy (Cloud Run)
```bash
gcloud builds submit --config cloudbuild.yaml --substitutions=_TAG=$(git rev-parse --short HEAD) .
# then set the key as an env var (never committed):
gcloud run services update scamper-mcp-server --region europe-west1 \
  --update-env-vars SCAMPER_LLM_API_KEY=<gemini-key>
```
The key is a Cloud Run env var only. Not wired into the BE.
