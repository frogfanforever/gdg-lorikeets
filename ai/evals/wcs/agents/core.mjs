import { Output, tool } from "ai";
import { z } from "zod";

/**
 * Retry budget for every ToolLoopAgent our runners build. The AI SDK retries with exponential
 * backoff (and honours the provider's Retry-After), so this is how many 429s a request rides out
 * before giving up. Our custom runners build their OWN agents, so unlike the stock AiSdkRunner
 * (which sets a huge value) they default to just 2 — one 429 on Gemini's free tier (20 req/min)
 * then kills the whole run. Bumped so rate-limited requests wait and retry instead of hard-failing.
 *
 * NOTE: this only smooths over PER-MINUTE throttling — it cannot create quota. A request-heavy
 * agent loop on the free tier is still throttled to ~20/min; for a smooth run use a billed key.
 */
export const MODEL_MAX_RETRIES = 8;

/** The shape every runner must return: a list of files (path + full content). */
export const FILES_SCHEMA = z.object({
  outputFiles: z.array(
    z.object({
      filePath: z
        .string()
        .describe("Path of the file being created or changed."),
      code: z.string().describe("Full content of the file."),
    }),
  ),
});

/**
 * Structured-output flavour — for runners with NO tools (SimpleAgentRunner, RagRunner). Forces the
 * model to answer as JSON matching FILES_SCHEMA.
 *
 * ⚠️ Do NOT combine this with `tools` on Gemini: the API rejects function calling together with a
 * JSON response mime type ("Function calling with a response mime type: 'application/json' is
 * unsupported"). Tool-using runners must deliver files via makeWriteFilesTool() instead.
 */
export const FILES_OUTPUT = Output.object({ schema: FILES_SCHEMA });

/**
 * Tool flavour — for runners that ALSO expose other tools (wiki search/read, MCP, …). The agent
 * delivers its result by CALLING this tool instead of via a JSON response, so the whole request is
 * pure function-calling and side-steps Gemini's tools-vs-JSON-mime limitation.
 *
 * Returns the tool plus a getter the runner reads after generate() resolves. Pair it with a stop
 * condition (`hasToolCall("write_files")`) so the loop ends once the agent submits.
 */
export function makeWriteFilesTool() {
  let files = [];
  const writeFiles = tool({
    description:
      "Submit the FINAL set of files for the app. Call this exactly once, when you are done, " +
      "passing the COMPLETE content of every file to create or change. This ends the task.",
    inputSchema: FILES_SCHEMA,
    execute: async ({ outputFiles }) => {
      files = outputFiles ?? [];
      return `Received ${files.length} file(s). Task complete.`;
    },
  });
  return { writeFiles, getFiles: () => files };
}

/**
 * Token → USD pricing. The AI SDK reports token USAGE, never a price, so we price it ourselves.
 * Rates are per 1,000,000 tokens (provider LIST prices — verify against current billing; high-context
 * tiers / cached input are cheaper). Thinking/reasoning tokens bill as OUTPUT on Gemini.
 */
const PRICING = {
  "gemini-2.5-flash": { input: 0.3, output: 2.5 },
  "gemini-2.5-flash-lite": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10.0 }, // ≤200k context tier
};

/** USD cost for a usage object, or null if the model isn't priced. */
export function costOf(model, usage = {}) {
  const p = PRICING[model];
  if (!p) return null;
  const input = usage.inputTokens ?? 0;
  const output = (usage.outputTokens ?? 0) + (usage.thinkingTokens ?? usage.reasoningTokens ?? 0);
  return +((input * p.input + output * p.output) / 1e6).toFixed(6);
}

/** One-line cost/usage summary for logs (cost omitted if the model isn't priced). */
export function summariseCost(model, usage = {}) {
  const cost = costOf(model, usage);
  const tok = usage.totalTokens ?? 0;
  return `${model}: ${tok.toLocaleString()} tokens` + (cost == null ? "" : ` ≈ $${cost.toFixed(4)}`);
}

/**
 * Print a cost/usage banner and return the cost. Goes to STDERR on purpose: WCS's progress UI owns
 * stdout (and overwrites single lines), so a plain console.log gets buried — stderr surfaces. The
 * blank lines + rule make it stand out in the scroll. Every custom runner calls this before returning.
 */
export function logCost(label, model, usage = {}) {
  const line = `💰 ${label} — ${summariseCost(model, usage)}`;
  console.error(`\n${"─".repeat(56)}\n${line}\n${"─".repeat(56)}\n`);
  return costOf(model, usage);
}

/**
 * Sums usage across the many model calls a multi-agent runner makes, and reports cost. Normalises
 * the AI SDK's differing fields (reasoningTokens vs thinkingTokens). Use: `const u = usageTracker();
 * u.add(res.totalUsage); … return { usage: u.usage() }`.
 */
export function usageTracker() {
  const byModel = new Map(); // model id → summed usage (so cost can be priced PER model)
  const blank = () => ({ inputTokens: 0, outputTokens: 0, thinkingTokens: 0, totalTokens: 0 });
  const grand = () => {
    const g = blank();
    for (const t of byModel.values()) for (const k of Object.keys(g)) g[k] += t[k];
    return g;
  };
  return {
    /** Add one call's usage, attributed to the model that produced it. */
    add(usage = {}, model = "unknown") {
      const t = byModel.get(model) ?? blank();
      t.inputTokens += usage.inputTokens ?? 0;
      t.outputTokens += usage.outputTokens ?? 0;
      t.thinkingTokens += usage.reasoningTokens ?? usage.thinkingTokens ?? 0;
      t.totalTokens += usage.totalTokens ?? 0;
      byModel.set(model, t);
    },
    usage: grand,
    cost() {
      let c = 0;
      for (const [m, t] of byModel) c += costOf(m, t) ?? 0;
      return +c.toFixed(6);
    },
    /** STDERR banner with a per-model breakdown (unpriced/local models show as $0); returns total cost. */
    log(label) {
      const rows = [...byModel].map(([m, t]) => {
        const c = costOf(m, t);
        return `   ${m}: ${t.totalTokens.toLocaleString()} tok` + (c == null ? "  (local · $0)" : `  ≈ $${c.toFixed(4)}`);
      });
      const total = this.cost();
      console.error(`\n${"─".repeat(56)}\n💰 ${label} — total ≈ $${total.toFixed(4)}\n${rows.join("\n")}\n${"─".repeat(56)}\n`);
      return total;
    },
  };
}
