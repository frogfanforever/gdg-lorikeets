// Stage 8 — HARNESS: THE FULL CLOSED LOOP (verify + validate). Builds on stage 7's write→verify→fix
// (lint conventions) by adding a VALIDATION gate the agent also runs itself: a real `ng serve --watch`
// is booted once, every write incrementally rebuilds, and the agent gets `build` (read the build log)
// and `run_axe` (real axe against the served app) tools. The gate order the agent must follow —
// verify (lint) → build (green) → axe — lives in the runner's agentNote.
//
// The SCOREBOARD is stage 7's white-box rules + JUST the two wcs gates this stage adds: axe (a11y)
// and the built-in build rating. Run with axe ON: `./run-task.sh 8` drops --skip-axe-testing.
import { axeRating, successfulBuildRating } from "web-codegen-scorer";
import { agenticConfig } from "./config.agentic-base.mjs";
import { AgentVerifyAndValidateRunner } from "../agents/agent-verifyvalidate.runner.mjs";
import { customRatings } from "./ratings/index.mjs";

export default agenticConfig({
  displayName: "Stage 8",
  runner: new AgentVerifyAndValidateRunner(),
  ratings: [...customRatings, axeRating, successfulBuildRating],
});
