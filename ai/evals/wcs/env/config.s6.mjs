// Stage 6 — HARNESS: PLAN-AND-EXECUTE AGENTIC RAG. Two shots, no reactive loop: the model reads the
// wiki INDEX and PLANS which pages it needs (agency — it picks the context, not stage-5's regex), we
// fetch them, then it writes every file at once (RAG-style, no write_file loop). More tokens than RAG
// (the extra planning call) but higher agency at similar accuracy — and far fewer tokens than the
// single-loop agent (single-tool-agent.runner.mjs), which re-billed written files every step.
import { agenticConfig } from "./config.agentic-base.mjs";
import { customRatings } from "./ratings/index.mjs";
import { AgentSingleToolRunner } from "../agents/agent-single-tool.runner.mjs";

export default agenticConfig({
  displayName: "Stage 6",
  runner: new AgentSingleToolRunner(),
  ratings: [...customRatings],
});
