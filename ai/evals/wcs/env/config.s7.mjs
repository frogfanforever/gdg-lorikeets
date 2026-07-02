// Stage 7 — HARNESS: THE CLOSED LOOP. The agent gets the wiki AND a verify(lint) tool: write → verify
// → fix, iterating until the checks pass. The rubric stops being just a scoreboard and becomes part of
// the generation loop.
import { agenticConfig } from "./config.agentic-base.mjs";
import { AgentVerifyRunner } from "../agents/agent-verify.runner.mjs";
import { customRatings } from "./ratings/index.mjs";

export default agenticConfig({
  displayName: "Stage 7",
  runner: new AgentVerifyRunner(),
  ratings: [...customRatings],
});
