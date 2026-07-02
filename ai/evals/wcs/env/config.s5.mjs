// Stage 5 — CONTEXT ENGINEERING. Same slim-core prompt + same scoreboard as the agentic stages, but
// the runner retrieves the task-relevant wiki partials (qmd) and injects them into the prompt up front.
// Single-shot RAG: no tools, no loop — just personalized context. The lift over a bare slim core is
// the whole point.
import { agenticConfig } from "./config.agentic-base.mjs";
import { RagRunner } from "../agents/rag.runner.mjs";
import { customRatings } from "./ratings";

export default agenticConfig({
  displayName: "Stage 5",
  runner: new RagRunner(),
  ratings: [...customRatings],
});
