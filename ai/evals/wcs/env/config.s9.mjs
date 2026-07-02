// Stage 9 — ADVANCED HARNESS: ORCHESTRATION FOR 100% ON THE GATES. Stop trusting one agent to run the
// whole show — the harness drives a deterministic pipeline: planner → writer → (verify → build)*. Two
// commitments make the gates a GUARANTEE rather than a suggestion: (1) fix-until-green — each gate has
// its own loop that stops only on convergence or no-progress, never a fixed round count that returns
// dirty; (2) an ISOLATED fixer per failure — the writer's context stays clean, each fix gets a tight
// brief + an "already tried" ledger. The axe/validate gate is parked while we nail buildable correctness.
//
// Scored on the SAME bar as Stage 8 (stage 7's rules + build + axe) so the two stay directly
// comparable — the axe number now shows the honest a11y cost of not fixing it, isolated from the
// build/convention score.
import { agenticConfig } from "./config.agentic-base.mjs";
import { WorkflowGatedAgentRunner } from "../agents/workflow-gated-agent.runner.mjs";
import { fullRatings } from "./ratings/index.mjs";

export default agenticConfig({
  displayName: "Stage 9",
  runner: new WorkflowGatedAgentRunner(),
  // All three gates the harness now drives fix-until-green: verify (lint) + build + axe (a11y).
  ratings: [...fullRatings],
});
