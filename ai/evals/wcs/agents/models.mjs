import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Per-agent model routing. The runners' main model still comes from WCS's `--model` (Gemini, via the
 * stock AiSdkRunner). This module adds LOCAL models through Ollama's OpenAI-compatible endpoint —
 * no API key, no rate limits, $0/token — so the output-heavy fixer can run off the paid Gemini tier.
 *
 * Gemma 4 supports structured output + function calling, so the fixer's JSON output works here.
 * (First run: confirm `ollama list` shows the model, and that structured output comes back clean —
 * Ollama's OpenAI-compat `response_format` support is the one thing to sanity-check.)
 */
const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
  apiKey: "ollama", // Ollama ignores it; the provider wants a non-empty string
});

/** The fixer/verifier model — local Gemma 4 (26B MoE) by default; override with FIXER_MODEL env. */
export const FIXER_MODEL_ID = process.env.FIXER_MODEL ?? "gemma4:26b";
export const fixerModel = () => ollama(FIXER_MODEL_ID);

// Ollama's NATIVE host (strip the /v1 openai-compat suffix). The /v1 path won't enforce a JSON
// schema for Gemma ("responseFormat not supported"), but the native /api/chat `format` field does.
const OLLAMA_HOST = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1").replace(/\/v1\/?$/, "");

// JSON Schema mirror of FILES_SCHEMA — handed to Ollama's `format` to force schema-conforming output.
const FILES_JSON_SCHEMA = {
  type: "object",
  properties: {
    outputFiles: {
      type: "array",
      items: {
        type: "object",
        properties: { filePath: { type: "string" }, code: { type: "string" } },
        required: ["filePath", "code"],
      },
    },
  },
  required: ["outputFiles"],
};

/**
 * Structured file generation on the local model via Ollama's NATIVE /api/chat `format` field —
 * reliable schema enforcement where the AI SDK's openai-compat `Output.object` is not. Returns the
 * files plus an AI-SDK-shaped usage object (so usageTracker can price it — at $0, since it's local).
 */
export async function ollamaGenerateFiles({ system, user, signal } = {}) {
  const res = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      model: FIXER_MODEL_ID,
      stream: false,
      format: FILES_JSON_SCHEMA,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal,
  });
  if (!res.ok) throw new Error(`Ollama ${res.status}: ${await res.text()}`);
  const data = await res.json();
  let files = [];
  try {
    files = JSON.parse(data.message?.content ?? "{}").outputFiles ?? [];
  } catch {
    /* malformed JSON despite format — leave files empty; the verify loop will re-trigger a fix */
  }
  const input = data.prompt_eval_count ?? 0;
  const output = data.eval_count ?? 0;
  return { files, usage: { inputTokens: input, outputTokens: output, totalTokens: input + output } };
}
