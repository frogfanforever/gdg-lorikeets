import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_OUTPUT, MODEL_MAX_RETRIES } from "./core.mjs";
import { wikiTools } from "./tools/wiki.tools.mjs";

/**
 * ToolAgentRunner — HARNESS engineering, in TWO PHASES (forced by Gemini's constraints):
 *
 *   Phase 1 — RESEARCH (agentic): a ToolLoopAgent with the wiki tools (search_wiki / read_wiki) and a
 *     20-step budget. The agent decides what guidance it needs, when, and how often. We collect the
 *     pages it actually reads (via wikiTools' onRead hook). No write tool, no structured output here.
 *   Phase 2 — DELIVERY (structured): a clean generation with FILES_OUTPUT and NO tools, fed the task
 *     plus the guidance the agent gathered. Plain JSON output — reliable on Gemini.
 *
 * Why split? Gemini can't do EITHER combo we'd otherwise want:
 *   - tools + JSON output           → "Function calling with a response mime type: 'application/json'
 *                                       is unsupported"
 *   - tools + a write_files call     → MALFORMED_FUNCTION_CALL on the nested array-of-objects payload.
 *
 * The result is "agent-chosen RAG": the agent drives retrieval through tools, then a clean call emits
 * the files. Self-contained; wiki access is the qmd CLI (see wiki.tools.mjs) — no MCP, no --mcp.
 */
const here = dirname(fileURLToPath(import.meta.url));
const MAX_RESEARCH_STEPS = 20;

// Phase-1 system note: tells the agent it's RESEARCHING now and writes code later. (Asking it not to
// write code keeps it from wasting steps drafting — delivery is phase 2's job.)
const RESEARCH_NOTE = [
  "## Angular wiki — research it before you build",
  "",
  "You have a curated Angular best-practices wiki, reachable through two tools:",
  "- `search_wiki(query)` — semantic search; returns the most relevant wiki page names.",
  "- `read_wiki(pages)` — returns the full guidance for the named page(s).",
  "",
  "This app is graded against the EXACT conventions in that wiki (forms, signals/state, change",
  "detection, templates, models, accessibility, …). RIGHT NOW your only job is to gather guidance:",
  "search for every capability the task touches and READ the relevant pages — up to 20 tool calls.",
  "Do NOT write any code yet. Once you have the guidance you need, briefly note which conventions",
  "apply and stop; you'll be asked to write the files next.",
].join("\n");

// Phase-2 guidance block: the pages the agent chose to read, injected into the delivery prompt.
function guidanceBlock(pages) {
  const body = pages
    .map(({ name, text }) => `<!-- wiki:${name} -->\n${text}`)
    .join("\n\n---\n\n");
  return `## Angular guidance you retrieved for this task — follow it exactly\n\n${body}`;
}

export class ToolAgentRunner extends AiSdkRunner {
  displayName = "ToolAgentRunner";

  async generateFiles(options) {
    const modelOptions = await this.getAiSdkModelOptions(options);
    const systemInstructions = options.context.systemInstructions ?? "";
    const taskPrompt = options.context.executablePrompt;

    // ── Phase 1: agentic research. The agent picks what to read; onRead collects the bodies. ──
    const collected = new Map(); // name → body (dedup across read_wiki calls)
    const researchAgent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      stopWhen: stepCountIs(MAX_RESEARCH_STEPS),
      tools: wikiTools({ onRead: (name, text) => collected.set(name, text) }),
    });

    const research = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        researchAgent.generate({
          messages: this.convertRequestToMessagesList({
            ...options,
            prompt: taskPrompt,
            systemPrompt: `${systemInstructions}\n\n${RESEARCH_NOTE}`,
          }),
          abortSignal,
        }),
    );

    // ── Phase 2: clean structured delivery (no tools). Inject the pages the agent chose. ──
    const pages = [...collected].map(([name, text]) => ({ name, text }));
    const deliverySystem = pages.length
      ? `${systemInstructions}\n\n${guidanceBlock(pages)}`
      : systemInstructions;

    const deliveryAgent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      output: FILES_OUTPUT, // JSON output, no tools → no MALFORMED_FUNCTION_CALL
    });

    const result = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        deliveryAgent.generate({
          messages: this.convertRequestToMessagesList({
            ...options,
            prompt: taskPrompt,
            systemPrompt: deliverySystem,
          }),
          abortSignal,
        }),
    );

    const files =
      result.output?.outputFiles ??
      result.experimental_output?.outputFiles ??
      [];

    // ── DIAGNOSTIC ── records the agent's retrieval behaviour + delivery outcome.
    try {
      mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, "../.run-debug/tool.json"),
        JSON.stringify(
          {
            phase1: {
              finishReason: research.finishReason,
              stepCount: (research.steps ?? []).length,
              toolCalls: (research.steps ?? []).flatMap((s) =>
                (s.toolCalls ?? []).map((t) => t.toolName),
              ),
              pagesRead: pages.map((p) => p.name),
            },
            phase2: {
              finishReason: result.finishReason,
              fileCount: files.length,
              files: files.map((f) => f.filePath),
            },
          },
          null,
          2,
        ),
      );
    } catch {}

    // Usage spans both phases.
    const ru = research.totalUsage ?? {};
    const du = result.totalUsage ?? result.usage ?? {};
    return {
      files,
      reasoning: result.reasoningText ?? "",
      usage: {
        inputTokens: (ru.inputTokens ?? 0) + (du.inputTokens ?? 0),
        outputTokens: (ru.outputTokens ?? 0) + (du.outputTokens ?? 0),
        thinkingTokens: (ru.reasoningTokens ?? 0) + (du.reasoningTokens ?? 0),
        totalTokens: (ru.totalTokens ?? 0) + (du.totalTokens ?? 0),
      },
    };
  }
}
