import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { MODEL_MAX_RETRIES } from "./core.mjs";
import { wikiTools } from "./tools/wiki.tools.mjs";
import { verifyTools } from "./tools/verify.tools.mjs";

/**
 * VerifyAgentRunner — the CLOSED-LOOP harness. The agent gets the wiki AND a verify(lint) tool, and
 * builds its own write → verify → fix → re-verify loop until the code is clean. No structured output;
 * no runner-orchestrated repair loop — the agent's native tool loop drives it (the multi-agent /
 * custom-loop version is the next step in the arc).
 *
 * Tools (all shared modules):
 *   - search_wiki / read_wiki   (wiki.tools)   — plan before building; look up a failing rule's convention.
 *   - write_file / verify       (verify.tools) — the in-memory workspace + the lint-backed feedback channel.
 *
 * verify checks CONVENTIONS, not task completion — an empty/stub project passes too, so the system
 * prompt carries the "verify ≠ done" warning. Self-contained; pairs with system-instructions.verify-flow.md.
 */
const here = dirname(fileURLToPath(import.meta.url));
const MAX_STEPS = 30; // write-per-file + verify + fix cycles burn steps; give the loop room

export class AgentVerifyRunner extends AiSdkRunner {
  displayName = "AgentVerifyRunner";

  async generateFiles(options) {
    const modelOptions = await this.getAiSdkModelOptions(options);
    const project = new Map(); // filePath → code (the agent's in-memory workspace)
    const verifyLog = []; // { findingCount, files } per verify pass — diagnostics

    const agent = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      stopWhen: stepCountIs(MAX_STEPS),
      tools: {
        ...wikiTools(),
        ...verifyTools(project, {
          onVerify: (errors, files) => verifyLog.push({ errors, files }),
        }),
      },
    });

    const result = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        agent.generate({
          messages: this.convertRequestToMessagesList({
            ...options,
            prompt: options.context.executablePrompt,
            systemPrompt: options.context.systemInstructions,
          }),
          abortSignal,
        }),
    );

    const files = [...project].map(([filePath, code]) => ({ filePath, code }));

    // ── DIAGNOSTIC ── the loop's shape: tool calls per step + the verify history.
    try {
      mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, "../.run-debug/verify.json"),
        JSON.stringify(
          {
            finishReason: result.finishReason,
            stepCount: (result.steps ?? []).length,
            toolCallsByStep: (result.steps ?? []).map((s) =>
              (s.toolCalls ?? []).map((t) => t.toolName),
            ),
            verifyHistory: verifyLog,
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
