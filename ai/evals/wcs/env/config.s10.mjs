// Stage 10 — ADVANCED HARNESS, TUNED. LITERALLY stage 9 (same planner → writer → verify → build
// pipeline, same fix-until-green loop, same gates and ratings) with ONE change: the output-heavy FIX
// step runs on a LOCAL Ollama Gemma instead of the paid Gemini. Planner + writer still run on Gemini
// where reasoning/quality matter; the fixer's many tokens cost $0 and aren't rate-limited. usageTracker
// prices each call by its own model, so the cost banner shows Gemini billed + fixer free.
//
// Needs `ollama` running with the fixer model pulled (see agents/models.mjs — gemma4:26b by default,
// override with FIXER_MODEL).
import { agenticConfig } from "./config.agentic-base.mjs";
import { WorkflowGatedAgentRunner } from "../agents/workflow-gated-agent.runner.mjs";
import { fullRatings } from "./ratings/index.mjs";

export default agenticConfig({
  displayName: "Stage 10",
  runner: new WorkflowGatedAgentRunner({ fixer: "ollama" }), // ← the ONLY difference from stage 9
  ratings: [...fullRatings], // same bar as stage 9
});
