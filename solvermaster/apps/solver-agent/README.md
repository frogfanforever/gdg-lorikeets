# solver-agent (LangChain / Deep Agents · Nx)

CLI runner for a [Deep Agents](https://docs.langchain.com/oss/javascript/deepagents/overview)
harness that solves engineering problems using **TRIZ**, backed by Gemini
(Google AI Studio) and an external **TRIZ MCP server** (pytriz).

## Architecture — orchestrator + subagents

The agent decomposes reasoning into three focused subagents, each with an isolated
context window and a restricted tool subset. The orchestrator coordinates via the
`task` delegation tool — there is no hard-coded pipeline.

```
User problem (PL free text)
        │
        ▼
  Orchestrator  ─── task ──▶  parameter-mapper
  (Gemini,                     tools: search_parameter, get_parameter_by_id
  responseFormat:              responseFormat: ContradictionMapping
  TrizSolution)    ◀── ContradictionMapping ───────────────────────────────┐
        │                                                                   │
        ├── task ──▶  principle-finder                                      │
        │             tools: browse_contradiction_matrix,                   │
        │                    get_principle_by_id, search_principle           │
        │             responseFormat: PrincipleCandidates                   │
        │  ◀── PrincipleCandidates ─────────────────────────────────────────┘
        │
        └── task ──▶  solution-synthesizer
                      tools: get_principle_by_id
                      responseFormat: TrizSolution
```

The orchestrator can re-delegate if a result looks weak, and decides the order
of delegation at runtime.

## Stack

| Layer | Technology |
|-------|------------|
| Agent harness | [`deepagents`](https://www.npmjs.com/package/deepagents) (`createDeepAgent`) |
| LLM | `@langchain/google-genai` (`ChatGoogleGenerativeAI`) — Gemini |
| MCP tools | `@langchain/mcp-adapters` (`MultiServerMCPClient`, Streamable HTTP) |
| Gemini 400 fallback | `@h1deya/langchain-google-genai-ex` (`ChatGoogleGenerativeAIEx`) |

## Layout

```
src/
  main.ts              CLI entry: load config -> run agent -> print solution
  config.ts            env vars, throws if GOOGLE_GENERATIVE_AI_API_KEY is missing
  agent.ts             buildAgent() -> createDeepAgent({ subagents, responseFormat })
  run.ts               runAgent(config, problem) -> { messages, toolCalls, solution }
  schema.ts            zod schemas: ContradictionMapping, PrincipleCandidates, TrizSolution
  prompts/
    loader.ts          .md loader (webpack copies prompts/ next to bundle)
    orchestrator.md    orchestrator: TRIZ goal, delegation guidance, no fixed sequence
    parameter-mapper.md
    principle-finder.md
    solution-synthesizer.md
    user_fake.md       default demo problem (e-waste / SDG 12)
  subagents/
    parameter-mapper.ts   SubAgent factory: search_parameter + get_parameter_by_id
    principle-finder.ts   SubAgent factory: browse_contradiction_matrix + ...
    solution-synthesizer.ts
  tools/
    mcp-triz.ts        MultiServerMCPClient connection + HTTP preflight
    registry.ts        buildTools() aggregator
evals/
  dataset.ts           8 golden eval cases with expected param IDs / delegations
  checks.ts            deterministic checks: output_valid, conflict_present,
                         param_ids_valid, principle_ids_valid, delegation_used,
                         param_match, principle_recall (runtime ground truth)
  run-eval.ts          eval runner: run cases -> score -> report.json -> --gate
```

## Structured output contract

`runAgent` returns a `TrizSolution`:

```ts
{
  contradictions: [{
    improving_parameter: { id: number, name: string },
    worsening_parameter: { id: number, name: string },
    description: string
  }],
  proposed_principles: [{
    id: number,
    name: string,
    application: string   // concrete use for this problem, in Polish
  }],
  summary: string          // Polish-language 3–5 sentence summary
}
```

The value comes from `result.structuredResponse` (Deep Agents native structured
output). A text-fence fallback (`parseSolution`) is used if unavailable.

## Environment variables

| Variable | Default | Required |
|----------|---------|----------|
| `GOOGLE_GENERATIVE_AI_API_KEY` | — | **yes** |
| `MCP_SERVER_URL` | `http://localhost:8123/mcp` | no |
| `AGENT_MODEL` | `gemini-2.5-pro` | no |
| `USE_GEMINI_EX` | `0` | no — set to `1` if Gemini returns 400 on MCP tool schemas |

## Run

### 1. Install dependencies

```bash
cd solvermaster
npm install
```

### 2. Configure environment

```bash
cp apps/solver-agent/.env.example apps/solver-agent/.env
```

Open `apps/solver-agent/.env` and set your Google AI Studio key:

```env
GOOGLE_GENERATIVE_AI_API_KEY=<your-key>
MCP_SERVER_URL=https://triz-mcp-server-66obdg3tha-ew.a.run.app/mcp   # or http://localhost:8123/mcp
AGENT_MODEL=gemini-2.5-flash
```

The public MCP server (`triz-mcp-server-66obdg3tha-ew.a.run.app`) is available by
default — no local pytriz install needed. To run a local one instead:

```bash
# separate terminal (gdg-mcp-workshop repo):
cd ~/gdg-mcp-workshop/mcp-server && uv sync && uv run python app/main.py
# then set MCP_SERVER_URL=http://localhost:8123/mcp in .env
```

### 3. Build and run

`npx nx serve` intercepts CLI flags, so build once and run the bundle directly:

```bash
cd solvermaster
./node_modules/.bin/nx build solver-agent
node dist/apps/solver-agent/main.js                  # built-in demo problem
```

### 4. Run with a custom problem

```bash
node dist/apps/solver-agent/main.js --problem "Zwiększenie przepustowości linii produkcyjnej pogarsza jakość produktów."
```

```bash
node dist/apps/solver-agent/main.js --problem "How can we reduce battery charging time without shortening battery lifespan?"
```

The agent accepts problems in any language — responses are produced in Polish.

After any code change, rebuild first:

```bash
./node_modules/.bin/nx build solver-agent && node dist/apps/solver-agent/main.js
```

## Run evals

MCP server must be reachable (`MCP_SERVER_URL` in `.env`).

```bash
cd solvermaster

# All 8 cases
./node_modules/.bin/nx eval solver-agent

# Single case by ID
./node_modules/.bin/nx eval solver-agent -- --case ewaste-recovery

# Non-zero exit code if any case fails (useful in CI)
./node_modules/.bin/nx eval solver-agent -- --gate

# Save report and merge pass-rate into a scores file
./node_modules/.bin/nx eval solver-agent -- --report evals/report.json --merge ../../ai/evals/scores.json
```

### Eval cases

| ID | Problem (short) |
|----|-----------------|
| `ewaste-recovery` | E-waste recovery vs. annual phone upgrades |
| `aircraft-wing-strength-weight` | Wing strength vs. weight / aerodynamic drag |
| `battery-energy-safety` | Battery energy density vs. overheating / fire risk |
| `drug-delivery-precision` | Drug concentration vs. side effects |
| `bridge-span-deflection` | Bridge span vs. deflection and vibration |
| `software-response-time-accuracy` | Speech model speed vs. accuracy |
| `thermal-insulation-conductivity` | Building insulation vs. electronics heat dissipation |
| `robot-speed-precision` | Robot speed vs. positioning accuracy |

### Eval checks (per case)

| Check | Description |
|-------|-------------|
| `output_valid` | Final result validates against `TrizSolution` schema |
| `conflict_present` | At least one contradiction returned |
| `param_ids_valid` | All parameter IDs in range 1–39 |
| `principle_ids_valid` | All principle IDs in range 1–40 |
| `delegation_used` | Expected subagents (default: `parameter-mapper`) appear in tool-call log |
| `param_match` | Agent improving/worsening IDs overlap expected sets from dataset |
| `principle_recall` | Agent principles overlap canonical set returned by `browse_contradiction_matrix` for expected param IDs (ground truth derived at runtime) |

### Tuning eval speed

Between cases the runner waits 60 s by default to avoid Gemini RPM rate limits.
Override with:

```bash
EVAL_INTER_CASE_DELAY_MS=15000 ./node_modules/.bin/nx eval solver-agent
```

## Expected MCP tools (pytriz)

`browse_contradiction_matrix`, `get_principle_by_id`, `get_parameter_by_id`,
`get_random_principles`, `search_parameter`, `search_principle`.

## Notes

- The MCP server is **not vendored** into this repo — it's the external
  [gdg-mcp-workshop](https://github.com/mmysior/gdg-mcp-workshop) project.
- If Gemini returns `400` on MCP tool schemas, set `USE_GEMINI_EX=1`.
- More subagents = more LLM calls (higher latency/cost) vs. a single-pass agent —
  accepted trade-off for isolated contexts and evaluable stages.
- Not yet integrated with `solver-api` (NestJS) — follow-up.
