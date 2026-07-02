import { generateText } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_OUTPUT, MODEL_MAX_RETRIES } from "./core.mjs";
import { retrieveGuidance } from "./tools/wiki.tools.mjs";

/**
 * RagRunner — context engineering, fully self-contained. Extends the stock AiSdkRunner but
 * reimplements generateFiles with a plain `generateText` call rather than an agent construct, ON
 * PURPOSE: this is the NON-agentic flavour of RAG (no tools, no step loop), so the runner shouldn't
 * even look like it could loop. (Compare ToolAgentRunner, which genuinely hands the agent tools —
 * that's the Harness Engineering example, not this one.)
 *
 * ALL retrieval logic — which wiki partials to fetch (the query builders, strategies, baseline,
 * threshold) and how to format them — lives in tools/wiki.tools.mjs. This runner only:
 *   1. generateFiles — a single `generateText` call with a structured `output` schema (FILES_OUTPUT).
 *      No tools, no stopWhen, no steps — one request in, one JSON response out.
 *   2. convertRequestToMessagesList — calls `retrieveGuidance(task)` and splices the returned block
 *      into the system message. To change WHICH strategy runs, edit `DEFAULT_STRATEGY` in wiki.tools —
 *      nothing here changes.
 *
 * Wired as Stage 5 (config.s5.mjs → config.agentic-base.mjs passes `new RagRunner()` as the executor's
 * runner). Retrieval is the qmd CLI (hybrid).
 */
export class RagRunner extends AiSdkRunner {
  displayName = "RAGRunner";

  // Single non-agentic call — generateText owns the model + the FILES_OUTPUT schema. No tools,
  // no step loop: this IS the stock AiSdkRunner.generateFiles() shape (see ai-sdk-runner.js), we
  // only splice retrieved guidance into the messages via convertRequestToMessagesList below.
  async generateFiles(options) {
    const result = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      async (abortSignal) =>
        generateText({
          ...(await this.getAiSdkModelOptions(options)),
          maxRetries: MODEL_MAX_RETRIES,
          output: FILES_OUTPUT,
          messages: this.convertRequestToMessagesList({
            ...options,
            prompt: options.context.executablePrompt,
            systemPrompt: options.context.systemInstructions,
          }),
          abortSignal,
        }),
    );
    return {
      files: result.output?.outputFiles ?? [],
      reasoning: result.reasoningText ?? "",
      usage: {
        inputTokens: result.usage?.inputTokens ?? 0,
        outputTokens: result.usage?.outputTokens ?? 0,
        thinkingTokens: result.usage?.reasoningTokens ?? 0,
        totalTokens: result.usage?.totalTokens ?? 0,
      },
    };
  }

  // The RAG seam: let the base build the canonical messages, then splice the retrieved guidance
  // block (built entirely in wiki.tools) into the system message. request.prompt = executablePrompt.
  convertRequestToMessagesList(request) {
    const messages = super.convertRequestToMessagesList(request);
    // Uses DEFAULT_STRATEGY (keyword-delta): inject only the task-specific docs the slim core doesn't
    // already cover, so RAG adds depth instead of re-pasting the baseline. Change the strategy in
    // wiki.tools.mjs (DEFAULT_STRATEGY), not here.
    const { block } = retrieveGuidance(request.prompt, "tech-req+threshold");
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
