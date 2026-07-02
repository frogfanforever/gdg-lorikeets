import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, Output } from "ai";
import { z } from "zod";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_OUTPUT, MODEL_MAX_RETRIES, usageTracker } from "./core.mjs";
import { wikiIndex, readWikiPage } from "./tools/wiki.tools.mjs";

/**
 * AdvancedToolAgentRunner — stage 6, PLAN-AND-EXECUTE (two shots, no reactive loop).
 *
 * The single-loop tool agent (single-tool-agent.runner.mjs) interleaved read_wiki + write_file in one
 * ReAct loop, which re-billed the whole (growing) conversation every step and blew up ~10× the tokens
 * for NO accuracy gain — because retrieval on this tiny, self-describing corpus needs no mid-stream
 * reaction. This runner replaces reactivity with a PLAN:
 *
 *   Shot 1 — PLAN:  give the model the wiki INDEX (page names + one-liners) and let it CHOOSE which
 *                   pages this task needs (model-driven, not the regex of stage-5 RAG). Structured
 *                   output → { pages, rationale }. One call.
 *   Fetch:          read those pages' full guidance deterministically (no model).
 *   Shot 2 — WRITE: inject the fetched guidance and write EVERY file at once, exactly like RagRunner
 *                   (FILES_OUTPUT, no write_file loop → nothing accumulates). One call.
 *
 * Net vs RAG: a bit MORE tokens (the extra planning call) but HIGHER AGENCY (the model picks the
 * context) at SIMILAR accuracy (the same guidance lands in the prompt). Net vs the single-loop agent:
 * far fewer tokens, because there is no per-step re-billing of written file contents.
 *
 * Extends AiSdkRunner only to reuse its message builder + timeout/rate-limit helper. Both shots are
 * pure structured-output (no tools), so Gemini's tools-vs-JSON-mime limitation never applies.
 */
const here = dirname(fileURLToPath(import.meta.url));
const MODEL_ID = "gemini-2.5-flash"; // for the cost banner only (the executor owns the real model)

// Capabilities the slim core already carries — the plan should spend picks on the DELTA, not these.
const CORE_COVERED =
  "components, templates, state-management, typescript, formatting, project-setup, accessibility, component-decorator";

/** Shot 1 output: the retrieval plan the model commits to before it writes any code. */
const PLAN_OUTPUT = Output.object({
  schema: z.object({
    pages: z
      .array(z.string())
      .describe(
        "Wiki page names to load, chosen BY NAME from the index (e.g. ['forms','services']).",
      ),
    rationale: z
      .string()
      .describe("One sentence: why these pages fit THIS task."),
  }),
});

/** agentNote #1 — the PLAN step (no code yet). */
const planNote = (index) =>
  [
    "## Step 1 of 2 — PLAN your context (do NOT write any code yet)",
    "",
    "You will build an Angular app that is graded against a curated best-practices wiki. FIRST, plan",
    "which wiki pages you need. Here is the full index — every page and a one-line summary:",
    "",
    index,
    "",
    "Choose the pages whose capability THIS task actually involves, reading their summaries against the",
    `task's Technical Requirements. Your base instructions ALREADY cover: ${CORE_COVERED} — do NOT pick`,
    "those; spend your picks on the DELTA the task adds (typically forms, services, models). Return the",
    "page names plus a one-line rationale. In Step 2 you'll receive those pages' full guidance and build.",
  ].join("\n");

/** agentNote #2 — the WRITE step. The fetched guidance is appended after this note. */
const writeNote = (pages) =>
  [
    "## Step 2 of 2 — BUILD the app",
    "",
    `You planned to use these wiki pages: ${pages.length ? pages.join(", ") : "(none)"}. Their full`,
    "guidance follows below. Apply it and write EVERY file with its COMPLETE content in a single response.",
  ].join("\n");

export class AgentAdvancedToolRunner extends AiSdkRunner {
  displayName = "AgentAdvancedToolRunner";

  async generateFiles(options) {
    const modelOptions = await this.getAiSdkModelOptions(options);
    const usage = usageTracker();
    const baseReq = {
      ...options,
      prompt: options.context.executablePrompt,
      systemPrompt: options.context.systemInstructions,
    };

    // ── Shot 1: PLAN ── the model picks the wiki pages from the index (structured output).
    const planAgent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      output: PLAN_OUTPUT,
    });
    const planRes = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        planAgent.generate({
          messages: this.#withSystemBlock(baseReq, planNote(wikiIndex())),
          abortSignal,
        }),
    );
    usage.add(planRes.totalUsage ?? planRes.usage, MODEL_ID);

    const plan = planRes.output ?? planRes.experimental_output ?? { pages: [] };

    // ── Fetch ── read the planned pages' full guidance (deterministic; drop any invalid name).
    const usedPages = [];
    const parts = [];
    for (const name of [...new Set(plan.pages ?? [])]) {
      try {
        parts.push(`<!-- wiki:${name} -->\n${readWikiPage(name)}`);
        usedPages.push(name);
      } catch {
        /* model named a page that doesn't exist — skip it */
      }
    }
    const guidanceBlock = parts.length
      ? `## Relevant Angular guidance for this task\n\n${parts.join("\n\n---\n\n")}`
      : "";

    // ── Shot 2: WRITE ── inject the guidance and write all files at once (RAG-style, no loop).
    const writeBlock = [writeNote(usedPages), guidanceBlock]
      .filter(Boolean)
      .join("\n\n");
    const writeAgent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      output: FILES_OUTPUT,
    });
    const writeRes = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        writeAgent.generate({
          messages: this.#withSystemBlock(baseReq, writeBlock),
          abortSignal,
        }),
    );
    usage.add(writeRes.totalUsage ?? writeRes.usage, MODEL_ID);

    const files =
      writeRes.output?.outputFiles ??
      writeRes.experimental_output?.outputFiles ??
      [];

    usage.log("AdvancedToolAgent (plan → write)");

    // ── DIAGNOSTIC ── what the model planned vs what it built (great for the slide).
    try {
      mkdirSync(resolve(here, ".run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, ".run-debug/advanced-tool.json"),
        JSON.stringify(
          {
            plannedPages: plan.pages ?? [],
            rationale: plan.rationale ?? "",
            usedPages,
            planUsage: planRes.totalUsage ?? planRes.usage ?? {},
            writeUsage: writeRes.totalUsage ?? writeRes.usage ?? {},
            finalFiles: files.map((f) => f.filePath),
          },
          null,
          2,
        ),
      );
    } catch {}

    const u = usage.usage();
    return {
      files,
      reasoning: writeRes.reasoningText ?? "",
      usage: {
        inputTokens: u.inputTokens,
        outputTokens: u.outputTokens,
        thinkingTokens: u.thinkingTokens,
        totalTokens: u.totalTokens,
      },
    };
  }

  // Build the canonical messages (Handlebars renders {{> contextFiles}} etc.) THEN append `block` to
  // the system message — same order as RagRunner, so wiki code examples containing `{{ }}` are added
  // post-render and never hit Handlebars (which would throw on an undefined var).
  #withSystemBlock(request, block) {
    const messages = this.convertRequestToMessagesList(request);
    if (!block) return messages;
    let injected = false;
    const next = messages.map((m) => {
      if (!injected && m.role === "system" && typeof m.content === "string") {
        injected = true;
        return { ...m, content: `${m.content}\n\n${block}` };
      }
      return m;
    });
    return injected ? next : [{ role: "system", content: block }, ...next];
  }
}
