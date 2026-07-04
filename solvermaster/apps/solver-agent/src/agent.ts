/**
 * Builds the Deep Agent harness:
 *   orchestrator (Gemini) + three focused subagents (parameter-mapper,
 *   principle-finder, solution-synthesizer), each with a restricted tool
 *   subset and a typed responseFormat.
 *
 * The orchestrator coordinates via the auto-added `task` tool and returns
 * a final TrizSolution through its own responseFormat.
 */
import { createDeepAgent } from 'deepagents';
import type { DeepAgent } from 'deepagents';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { AgentConfig } from './config';
import { SubagentPrompts } from './prompts/loader';
import { buildParameterMapper } from './subagents/parameter-mapper';
import { buildPrincipleFinder } from './subagents/principle-finder';
import { buildSolutionSynthesizer } from './subagents/solution-synthesizer';

type GeminiExModule = typeof import('@h1deya/langchain-google-genai-ex');

/**
 * Forces a genuine runtime ESM `import()` that webpack cannot statically
 * rewrite into a CommonJS `require()`. Needed because
 * `@h1deya/langchain-google-genai-ex`'s published `require` export
 * condition is currently broken (points to a non-existent `dist/index.cjs`),
 * while its `import` condition resolves correctly.
 */
const dynamicImport = new Function(
  'specifier',
  'return import(specifier);'
) as (specifier: string) => Promise<GeminiExModule>;

/**
 * Recursively strips JSON-Schema fields that Gemini's response_schema does
 * not accept: `$schema` and `additionalProperties`.
 *
 * The `langchain` AgentNode passes the raw `zod-to-json-schema` output as
 * `options.responseSchema` bypassing the sanitization that
 * `ChatGoogleGenerativeAI.withStructuredOutput` normally applies via
 * `schemaToGenerativeAIParameters`. This helper covers that path.
 */
function sanitizeGeminiSchema(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeGeminiSchema);
  const result = { ...(obj as Record<string, unknown>) };
  delete result['$schema'];
  delete result['additionalProperties'];
  for (const key of Object.keys(result)) {
    result[key] = sanitizeGeminiSchema(result[key]);
  }
  return result;
}

type AnyConstructor = new (...args: any[]) => ChatGoogleGenerativeAI;

/**
 * Mixin that applies two Gemini compatibility fixes:
 *
 * 1. **responseSchema sanitization** – strips `$schema` and
 *    `additionalProperties` fields that the Gemini API rejects. The
 *    `langchain` AgentNode passes the raw `zod-to-json-schema` output
 *    directly as `options.responseSchema`, bypassing the sanitization that
 *    `ChatGoogleGenerativeAI.withStructuredOutput` normally applies.
 *
 * 2. **ToolStrategy forcing** – overrides `profile.structuredOutput` to
 *    `false` so `langchain` always uses function-calling-based structured
 *    output (ToolStrategy) instead of native JSON-schema mode
 *    (ProviderStrategy). Gemini rejects the combination of
 *    `responseMimeType: application/json` with bound tools; ToolStrategy
 *    routes the structured response through a regular tool call and is
 *    compatible with other tools being present in the same request.
 */
function withGeminiCompat<TBase extends AnyConstructor>(Base: TBase) {
  return class extends Base {
    override get profile(): Record<string, unknown> {
      const base = super.profile as Record<string, unknown>;
      return { ...base, structuredOutput: false };
    }

    override invocationParams(
      options?: Parameters<ChatGoogleGenerativeAI['invocationParams']>[0]
    ): ReturnType<ChatGoogleGenerativeAI['invocationParams']> {
      const params = super.invocationParams(options);
      const gc = params.generationConfig as Record<string, unknown> | undefined;
      if (gc?.['responseSchema'] != null) {
        gc['responseSchema'] = sanitizeGeminiSchema(gc['responseSchema']);
      }
      return params;
    }
  };
}

/**
 * Some Gemini + MCP tool-schema combinations trigger a 400 from the stock
 * `@langchain/google-genai` client (unsupported JSON-schema constructs such
 * as `anyOf`/`exclusiveMaximum`). `ChatGoogleGenerativeAIEx` is a drop-in
 * subclass that rewrites tool schemas for Gemini compatibility; opt in with
 * `USE_GEMINI_EX=1` without touching code.
 */
async function buildModel(config: AgentConfig): Promise<ChatGoogleGenerativeAI> {
  const opts = {
    model: config.agentModel,
    apiKey: config.googleApiKey,
  };

  if (process.env.USE_GEMINI_EX === '1') {
    const { ChatGoogleGenerativeAIEx } = await dynamicImport(
      '@h1deya/langchain-google-genai-ex'
    );
    const CompatEx = withGeminiCompat(
      ChatGoogleGenerativeAIEx as unknown as typeof ChatGoogleGenerativeAI
    );
    return new CompatEx(opts);
  }

  const Compat = withGeminiCompat(ChatGoogleGenerativeAI);
  return new Compat(opts);
}

export async function buildAgent(
  config: AgentConfig,
  tools: DynamicStructuredTool[],
  orchestratorPrompt: string,
  subagentPrompts: SubagentPrompts
): Promise<DeepAgent> {
  const model = await buildModel(config);

  const subagents = [
    buildParameterMapper(tools, subagentPrompts.parameterMapper),
    buildPrincipleFinder(tools, subagentPrompts.principleFinder),
    buildSolutionSynthesizer(tools, subagentPrompts.solutionSynthesizer),
  ];

  return createDeepAgent({
    model,
    tools,
    systemPrompt: orchestratorPrompt,
    subagents,
  });
}
