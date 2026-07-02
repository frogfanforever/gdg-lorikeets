import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs, hasToolCall } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { MODEL_MAX_RETRIES } from "./core.mjs";
import { readWikiTool, wikiIndex } from "./tools/wiki.tools.mjs";
import { fileTools } from "./tools/files.tools.mjs";

/**
 * SingleToolAgentRunner — stage 6b: ONE tool-calling loop that both RESEARCHES and DELIVERS. Unlike
 * ToolAgentRunner (which splits research + delivery into two agents to dodge Gemini's tools+JSON
 * limitation), this agent keeps a single loop and delivers files through a FLAT `write_file` tool —
 * one file, two strings per call — which serializes cleanly on Gemini (a nested write_files([{…}])
 * would MALFORMED_FUNCTION_CALL; see verify.tools.mjs).
 *
 * The point of the stage: showcase AUTOMATIC tool calling and its pros/cons. The agent gets:
 *   - the WIKI INDEX injected up front (every partial + its one-liner) → it reads BY NAME, no search.
 *   - `read_wiki(pages, mode)` with mode 'intro'|'full' → it chooses how much to pull per doc.
 *   - `write_file` + `finish` → it writes the app and signals completion.
 *
 * Stop = the agent calls `finish` OR the tool-call budget (MAX_STEPS) is hit — so it can't overshoot.
 * Self-contained; wiki access is the qmd-backed read helper (no MCP).
 */
const here = dirname(fileURLToPath(import.meta.url));
const MAX_STEPS = 24; // a few reads + one write per file (~11) + finish, with headroom

// Capabilities the slim core already carries — the agent should spend reads on the DELTA, not these.
const CORE_COVERED =
  "components, templates, state-management, typescript, formatting, project-setup, accessibility, component-decorator";

const agentNote = (index) =>
  [
    "## Angular best-practices wiki — fetch what THIS task needs, then build",
    "",
    "This app is graded against a curated wiki of Angular conventions. You can read any partial below",
    "by name with `read_wiki`. Available partials:",
    "",
    index,
    "",
    "How to work:",
    "1. Read ONLY the partials whose capability THIS task actually involves.",
    `2. Your base instructions ALREADY cover: ${CORE_COVERED}. Don't re-read those unless you need a`,
    "   specific detail — spend reads on the DELTA the task adds (e.g. forms, services, models).",
    "3. Use mode:'intro' to confirm relevance or for a capability you only touch lightly; mode:'full'",
    "   for the capability you are actually implementing.",
    "4. Write every file with `write_file` — one call per file, the COMPLETE content.",
    "5. Call `finish` exactly once, when all files are written. That ends the task.",
  ].join("\n");

export class AgentSingleToolRunner extends AiSdkRunner {
  displayName = "AgentSingleToolRunner";

  async generateFiles(options) {
    const modelOptions = await this.getAiSdkModelOptions(options);
    const project = new Map(); // filePath → code (the agent's in-memory workspace)
    const reads = []; // { name, mode } per read_wiki page — diagnostics

    const agent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      stopWhen: [hasToolCall("finish"), stepCountIs(MAX_STEPS)],
      tools: {
        ...readWikiTool({ onRead: (name, mode) => reads.push({ name, mode }) }),
        ...fileTools(project),
      },
    });

    const systemPrompt = `${options.context.systemInstructions ?? ""}\n\n${agentNote(wikiIndex())}`;

    const result = await this._wrapRequestWithTimeoutAndRateLimiting(
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

    const files = [...project].map(([filePath, code]) => ({ filePath, code }));

    // ── DIAGNOSTIC ── the loop's shape: tool calls per step + what/how the agent read.
    try {
      mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, "../.run-debug/single-tool.json"),
        JSON.stringify(
          {
            finishReason: result.finishReason,
            stepCount: (result.steps ?? []).length,
            toolCallsByStep: (result.steps ?? []).map((s) =>
              (s.toolCalls ?? []).map((t) => t.toolName),
            ),
            reads, // [{ name, mode }] — shows intro-vs-full choices
            finalFiles: files.map((f) => f.filePath),
          },
          null,
          2,
        ),
      );
    } catch {}

    const u = result.totalUsage ?? result.usage ?? {};
    return {
      files,
      reasoning: result.reasoningText ?? "",
      usage: {
        inputTokens: u.inputTokens ?? 0,
        outputTokens: u.outputTokens ?? 0,
        thinkingTokens: u.reasoningTokens ?? 0,
        totalTokens: u.totalTokens ?? 0,
      },
    };
  }
}
