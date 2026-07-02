import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, generateText, stepCountIs } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_OUTPUT, MODEL_MAX_RETRIES, usageTracker } from "./core.mjs";
import { wikiTools, readWikiPage } from "./tools/wiki.tools.mjs";
import { lintProject, errorsOf, formatVerify } from "./tools/verify.tools.mjs";
import { auditAxe } from "./tools/validate.tools.mjs";
import { ServeHarness } from "./tools/serve.tools.mjs";

/**
 * WorkflowAgentRunner — orchestrated FULL two-gate loop with a PERSISTENT engineer conversation.
 *
 * WE drive control flow deterministically (in code); the model does the writing and fixing. Unlike the
 * earlier stateless-fixer version (which thrashed for 8 rounds because each fix was amnesiac), there is
 * ONE engineer conversation: the writer's output stays in the history, and every gate failure is
 * appended as a MESSAGE. So the model sees its own prior attempts + why they failed and converges —
 * it "jumps back" with full context instead of re-deriving from scratch.
 *
 *   1. PLANNER (tools: wiki)  — distill a concise conventions checklist (text only, one agent).
 *   2. ENGINEER conversation  — [system + checklist + hard constraints] → writes all files, then
 *      fixes, keeping context. Deterministic gates run as plain code (zero tokens) between turns:
 *        GATE 1 VERIFY  : lintProject()          (conventions)
 *        GATE 2a BUILD  : ng serve rebuild        (compiles)
 *        GATE 2b AXE    : real axe-core           (accessible)
 *      A failing gate is appended to the conversation as a user message; the loop re-runs from GATE 1
 *      after every fix (so a validate-fix that reintroduces a lint issue is caught again).
 *
 * Tokens stay far below the single-agent loop: the gates are code (no lint/build/axe output re-entering
 * as tool results), gate feedback is terse (the model already has the current files in its own history,
 * so we never re-attach them), and convergence is fast once the model has memory of its attempts.
 */
const here = dirname(fileURLToPath(import.meta.url));
const PLANNER_MAX_STEPS = 12;
const MAX_ROUNDS = 6; // fix cycles across BOTH gates, with re-routing — converges fast with memory

const BASE = "You are an expert Angular (v20+) and TypeScript engineer.";

const PLANNER_PROMPT = `${BASE}
You are the PLANNER. Identify every Angular capability this task involves — including the ones it
does NOT name out loud (every component has @Component decorator conventions; every data model has
declaration conventions; every page needs a <main> landmark and an <h1> for accessibility). Use
search_wiki / read_wiki to consult the curated best-practices wiki, then output a CONCISE checklist
(terse bullet points) of the SPECIFIC conventions the implementation must follow for this task. Rules
only — no code, no padding. This checklist is the ONLY thing handed to the engineer, so make it
complete but tight.`;

// The engineer's ROLE only — the build-critical rules come from the shared slim core (static.md, reused
// below), and the SPECIFICS come from each gate's targeted repair message. No hand-rolled gotcha list.
const ENGINEER_ROLE = `${BASE}
You are the ENGINEER. First implement the COMPLETE app the task asks for. Then you will be shown the
results of automated checks — lint conventions (verify), then build, then accessibility (validate) —
run on YOUR code. Fix exactly what each check reports, keep the feature working, and remember what you
already tried. Always output the COMPLETE content of every file you create or change.`;

export class WorkflowAgentRunner extends AiSdkRunner {
  displayName = "WorkflowAgentRunner";

  async generateFiles(options) {
    const task = options.context.executablePrompt;
    const modelOptions = await this.getAiSdkModelOptions(options);
    const trace = { plannerSteps: 0, briefChars: 0, rounds: [], engineerTurns: 0, converged: false };
    const tok = usageTracker();
    const harness = new ServeHarness();

    try {
      // ── Agent 1: PLANNER — wiki → concise conventions checklist (text only) ──
      const planner = new ToolLoopAgent({
        ...modelOptions,
        maxRetries: MODEL_MAX_RETRIES,
        stopWhen: stepCountIs(PLANNER_MAX_STEPS),
        tools: wikiTools(),
      });
      const planRes = await this._wrapRequestWithTimeoutAndRateLimiting(options, (abortSignal) =>
        planner.generate({
          messages: this.convertRequestToMessagesList({ ...options, prompt: task, systemPrompt: PLANNER_PROMPT }),
          abortSignal,
        }),
      );
      const brief = (planRes.text ?? "").trim();
      tok.add(planRes.totalUsage, options.model);
      trace.plannerSteps = (planRes.steps ?? []).length;
      trace.briefChars = brief.length;

      // ── The ENGINEER conversation: one persistent message list, shared writer + fixer context. ──
      const project = new Map();
      const messages = [
        { role: "system", content: `${options.context.systemInstructions ?? ""}\n\n${ENGINEER_ROLE}\n\n## Conventions to follow for this task\n${brief}` },
        { role: "user", content: `${task}\n\nWrite the COMPLETE app now — every file, full content.` },
      ];
      const applyFiles = (outputFiles) => {
        for (const f of outputFiles ?? []) {
          if (!f?.filePath) continue;
          project.set(f.filePath, f.code ?? "");
          harness.writeFile(f.filePath, f.code ?? ""); // mirror to the served workdir → triggers rebuild
        }
      };
      // One engineer turn: generate against the running conversation, keep its reply in history, apply.
      const engineerTurn = async () => {
        const res = await this._wrapRequestWithTimeoutAndRateLimiting(options, (abortSignal) =>
          generateText({ ...modelOptions, maxRetries: MODEL_MAX_RETRIES, output: FILES_OUTPUT, messages, abortSignal }),
        );
        tok.add(res.totalUsage ?? res.usage, options.model);
        trace.engineerTurns++;
        const files = res.output?.outputFiles ?? res.experimental_output?.outputFiles ?? [];
        // Keep the model's own output in context so the next turn sees what it wrote (compact summary +
        // the reply text) — this is the memory that lets it "jump back" without repeating mistakes.
        messages.push({ role: "assistant", content: res.text?.trim() || JSON.stringify({ wrote: files.map((f) => f.filePath) }) });
        applyFiles(files);
        return files.length;
      };

      // WRITER = the first engineer turn.
      await harness.start(); // boot ng serve before the first build gate
      await engineerTurn();

      // ── Two-gate loop. Feedback is appended as a message; re-runs from GATE 1 after each fix. ──
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const files = [...project].map(([filePath, code]) => ({ filePath, code }));

        // GATE 1 — VERIFY (lint conventions): free, deterministic.
        const rawFindings = lintProject(files);
        const lintErrors = errorsOf(rawFindings);
        if (lintErrors.length) {
          trace.rounds.push({ round, gate: "verify", issues: lintErrors.length });
          messages.push({
            role: "user",
            content: `Automated CODE-STYLE check (lint) FAILED — ${lintErrors.length} issue(s). These are the exact conventions this app is graded on. Fix every one (keep the feature working), then return the COMPLETE content of each file you change. You will be automatically re-checked.\n\n${formatVerify(files, rawFindings)}`,
          });
          await engineerTurn();
          continue;
        }

        // GATE 2a — BUILD (must compile): free, deterministic.
        const build = await harness.awaitBuild();
        if (!build.ok) {
          trace.rounds.push({ round, gate: "build", issues: 1 });
          messages.push({
            role: "user",
            content: `Automated BUILD check FAILED — the app does not compile (\`ng build\`). Fix these TypeScript/Angular compile errors, then return the COMPLETE content of each file you change. You will be automatically re-checked.\n\n${build.errors || "(compilation failed)"}`,
          });
          await engineerTurn();
          continue;
        }

        // GATE 2b — AXE (validate / a11y): DISABLED for now. We're chasing 100% CORRECTNESS first
        // (verify + build). Axe is still SCORED (unchanged scoreboard), so its number shows the honest
        // a11y cost of not fixing it — but the loop no longer spends rounds/tokens on it. Re-enable once
        // the verify→build loop reliably converges green.
        // let violations = [];
        // try { violations = await auditAxe(harness.url); } catch { violations = []; }
        // if (violations.length) {
        //   const list = violations
        //     .map((v, i) => `  ${i + 1}. [${v.impact}] ${v.id}: ${v.description}\n     e.g. ${(v.nodes?.[0]?.html ?? "").slice(0, 120)}`)
        //     .join("\n");
        //   const a11y = (() => { try { return readWikiPage("accessibility"); } catch { return ""; } })();
        //   trace.rounds.push({ round, gate: "axe", issues: violations.length });
        //   messages.push({
        //     role: "user",
        //     content: `Automated ACCESSIBILITY check (axe-core) FAILED — ${violations.length} violation(s). Fix them in the templates (e.g. wrap the page content in a <main> landmark, add an <h1>, label every control), then return the COMPLETE content of each file you change. You will be automatically re-checked.\n\n${list}\n\n## Accessibility guidance\n${a11y}`,
        //   });
        //   await engineerTurn();
        //   continue;
        // }

        // verify + build clean (axe gate disabled)
        trace.converged = true;
        trace.rounds.push({ round, gate: "done", issues: 0 });
        break;
      }

      const files = [...project].map(([filePath, code]) => ({ filePath, code }));
      const usage = tok.usage();
      const costUsd = tok.log(this.displayName);
      try {
        mkdirSync(resolve(here, ".run-debug"), { recursive: true });
        writeFileSync(
          resolve(here, ".run-debug/workflow.json"),
          JSON.stringify({ ...trace, finalFiles: files.map((f) => f.filePath), usage, costUsd }, null, 2),
        );
      } catch {}

      return { files, reasoning: "", usage };
    } finally {
      await harness.dispose();
    }
  }
}
