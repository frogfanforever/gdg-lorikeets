import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs, tool } from "ai";
import { z } from "zod";
import { AiSdkRunner } from "web-codegen-scorer";
import { MODEL_MAX_RETRIES } from "./core.mjs";
import { wikiTools } from "./tools/wiki.tools.mjs";
import { verifyTool } from "./tools/verify.tools.mjs";
import { validateTools } from "./tools/validate.tools.mjs";
import { ServeHarness } from "./tools/serve.tools.mjs";

/**
 * ValidateAgentRunner — Stage 8: the FULL closed loop, TWO gates.
 *
 * Stage 7 gave the agent verify() (lint conventions). Stage 8 adds a VALIDATION gate the agent also
 * drives itself: a single `ng serve --watch` is booted for the whole run (ServeHarness), every
 * write_file lands on disk and the dev server incrementally rebuilds, and the agent gets `build`
 * (read the build log) + `run_axe` (real axe against the served app).
 *
 * The gate ORDER is the lesson (and is spelled out in the agentNote):
 *   verify (lint, instant) → build (must be GREEN) → run_axe (a11y) → fix → repeat.
 * A lint-dirty or non-compiling app makes the served page meaningless, so the quality gate MUST come
 * after the verification gate — otherwise the audit just fails on a broken build.
 *
 * Tools: search_wiki / read_wiki (wiki) · write_file (in-memory Map AND the served workdir) ·
 * verify (lint) · build (dev-server status) · run_axe (axe-core). Self-contained; the serve harness
 * is torn down in `finally`.
 */
const here = dirname(fileURLToPath(import.meta.url));
const MAX_STEPS = 40; // two gates + fix cycles across ~11 files — give the loop room

const agentNote = () =>
  [
    "## How to work — plan, build, then clear BOTH gates in order",
    "",
    "You build the app with tools and keep going until it is verified AND validated. Deliver the",
    "COMPLETE feature the task describes — never a stub (both gates pass on an empty project too).",
    "",
    "1. **Plan.** `search_wiki` / `read_wiki` the capabilities this task uses (component, forms, model,",
    "   service, state, accessibility, …) — including the ones it doesn't name out loud.",
    "2. **Build.** Write each file with `write_file` (one call per file, complete content).",
    "3. **GATE 1 — verify (code style).** Call `verify()`. It lints with the exact rules you're graded",
    "   on and links each issue to a wiki page. Fix and re-verify until it reports 0. This is instant.",
    "4. **GATE 2 — validate (quality) — ONLY after verify is clean:**",
    "   a. `build()` — the dev server rebuilds on every save; confirm the build is GREEN. Fix any",
    "      compile errors and build() again first.",
    "   b. `run_axe()` — a real accessibility audit. Fix every violation (e.g. wrap the page content in",
    "      a `<main>` landmark and give the page an `<h1>`), write_file, and re-run until it reports 0.",
    "",
    "   Do the gates IN THIS ORDER — verify → build → axe. A lint-dirty or non-compiling app makes the",
    "   served page stale/errored, so running axe first just fails on a broken build.",
    "5. **Finish** when verify is clean, build is green, axe is 0, AND the app is the complete feature.",
  ].join("\n");

export class AgentVerifyAndValidateRunner extends AiSdkRunner {
  displayName = "AgentVerifyAndValidateRunner";

  async generateFiles(options) {
    const modelOptions = await this.getAiSdkModelOptions(options);
    const project = new Map(); // filePath → code (verify lints this in-memory copy)
    const diag = { verify: [], axe: [] };
    const harness = new ServeHarness();
    let result;

    try {
      await harness.start(); // boot ng serve on a throwaway copy of the starter

      // write_file mirrors to BOTH the in-memory Map (for verify's lint) AND the served workdir on
      // disk (so the dev server rebuilds → build()/run_axe() see the change).
      const writeFile = {
        write_file: tool({
          description:
            "Create or overwrite ONE file with its COMPLETE content (e.g. src/app/app.ts). Call once " +
            "per file; re-call to fix a file. Each write triggers a dev-server rebuild.",
          inputSchema: z.object({
            filePath: z.string().describe("Path, e.g. 'src/app/app.ts'."),
            code: z.string().describe("The full file content."),
          }),
          execute: async ({ filePath, code }) => {
            project.set(filePath, code);
            harness.writeFile(filePath, code);
            return `Saved ${filePath}. Project now has ${project.size} file(s): ${[...project.keys()].join(", ")}.`;
          },
        }),
      };

      const agent = new ToolLoopAgent({
        ...modelOptions,
        maxRetries: MODEL_MAX_RETRIES,
        stopWhen: stepCountIs(MAX_STEPS),
        tools: {
          ...wikiTools(),
          ...writeFile,
          ...verifyTool(project, {
            onVerify: (errors, files) => diag.verify.push({ errors, files }),
          }),
          ...validateTools(harness, {
            onAxe: (v) => diag.axe.push(v.map((x) => x.id)),
          }),
        },
      });

      const systemPrompt = `${options.context.systemInstructions ?? ""}\n\n${agentNote()}`;
      result = await this._wrapRequestWithTimeoutAndRateLimiting(
        options,
        (abortSignal) =>
          agent.generate({
            messages: this.convertRequestToMessagesList({
              ...options,
              prompt: options.context.executablePrompt,
              systemPrompt,
            }),
            abortSignal,
          }),
      );
    } finally {
      await harness.dispose(); // always kill ng serve + remove the temp workdir
    }

    const files = [...project].map(([filePath, code]) => ({ filePath, code }));

    // ── DIAGNOSTIC ── loop shape + gate history.
    try {
      mkdirSync(resolve(here, ".run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, ".run-debug/validate.json"),
        JSON.stringify(
          {
            finishReason: result?.finishReason,
            stepCount: (result?.steps ?? []).length,
            toolCallsByStep: (result?.steps ?? []).map((s) =>
              (s.toolCalls ?? []).map((t) => t.toolName),
            ),
            verifyHistory: diag.verify,
            axeHistory: diag.axe,
            finalFiles: files.map((f) => f.filePath),
          },
          null,
          2,
        ),
      );
    } catch {}

    const u = result?.totalUsage ?? result?.usage ?? {};
    return {
      files,
      reasoning: result?.reasoningText ?? "",
      usage: {
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
        thinkingTokens: u.reasoningTokens ?? 0,
        totalTokens: u.totalTokens ?? 0,
      },
    };
  }
}
