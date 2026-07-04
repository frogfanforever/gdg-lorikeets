/**
 * runAgent — shared entry point used by both main.ts (CLI) and the eval harness.
 *
 * Returns:
 *  - messages: full conversation history
 *  - toolCalls: flat list of all tool/task invocations (name + args)
 *  - solution: TrizSolution from structuredResponse, or parsed from prose as fallback
 */
import { isAIMessage, BaseMessage } from '@langchain/core/messages';
import { BaseCallbackHandler } from '@langchain/core/callbacks/base';
import type { Serialized } from '@langchain/core/load/serializable';
import type { AgentAction } from '@langchain/core/agents';
import type { LLMResult } from '@langchain/core/outputs';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { AgentConfig } from './config';
import { loadSystemPrompt, loadSubagentPrompts } from './prompts/loader';
import { preflightMcpServer } from './tools/mcp-triz';
import { buildTools, closeTools, ToolsBundle } from './tools/registry';
import { buildAgent } from './agent';
import { TrizSolution, parseSolution, ParseResult } from './schema';

function logLine(prefix: string, message: string): void {
  if (!message) {
    process.stdout.write(`${prefix}\n`);
    return;
  }
  process.stdout.write(`${prefix} ${message}\n`);
}

function truncate(text: string, max = 80): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function compactJson(value: unknown, max = 100): string {
  if (typeof value === 'string') return truncate(value, max);
  try {
    return truncate(JSON.stringify(value), max);
  } catch {
    return truncate(String(value), max);
  }
}

function summarizeOutput(value: unknown): string {
  if (value == null) return 'empty';
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 'empty';
    try {
      const parsed = JSON.parse(trimmed) as unknown;
      if (Array.isArray(parsed)) return `${parsed.length} items`;
      if (parsed && typeof parsed === 'object') {
        return `${Object.keys(parsed as object).length} keys`;
      }
    } catch {
      // plain text
    }
    return truncate(trimmed, 60);
  }
  if (Array.isArray(value)) return `${value.length} items`;
  if (typeof value === 'object') return `${Object.keys(value as object).length} keys`;
  return truncate(String(value), 60);
}

function formatTokenUsage(usage: unknown): string | null {
  if (usage == null || typeof usage !== 'object') return null;
  const u = usage as Record<string, unknown>;
  const parts: string[] = [];
  if (u['promptTokens'] != null) parts.push(`in=${u['promptTokens']}`);
  if (u['completionTokens'] != null) parts.push(`out=${u['completionTokens']}`);
  if (parts.length === 0 && u['totalTokens'] != null) {
    parts.push(`total=${u['totalTokens']}`);
  }
  return parts.length ? parts.join(' ') : null;
}

function logBlock(prefix: string, content: string): void {
  if (!content.trim()) {
    logLine(prefix, '(empty)');
    return;
  }
  logLine(prefix, '');
  for (const line of content.split('\n')) {
    process.stdout.write(`    ${line}\n`);
  }
}

function serializeForLog(value: unknown): string {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function resolveToolName(tool: Serialized, input?: string): string {
  const t = tool as { name?: string; id?: string[]; kwargs?: { name?: string } };
  const fromSerialized = t.kwargs?.name ?? t.name;
  if (fromSerialized && fromSerialized !== 'DynamicStructuredTool') {
    return fromSerialized;
  }
  // LangChain sometimes passes only the class name in callbacks — fall back to id path.
  const fromId = t.id?.at(-1);
  if (fromId && fromId !== 'DynamicStructuredTool') return fromId;
  // Last resort: if input is JSON with a known shape, keep generic label.
  return fromSerialized ?? fromId ?? 'unknown-tool';
}

function resolveAgentLabel(
  parentRunId: string | undefined,
  metadata?: Record<string, unknown>,
  tags?: string[]
): string {
  const metaName =
    (metadata?.['lc_agent_name'] as string | undefined) ??
    (metadata?.['ls_agent_type'] as string | undefined);
  if (metaName) return metaName;
  const tag = tags?.find((t) => t.startsWith('subagent:'));
  if (tag) return tag.slice('subagent:'.length);
  return parentRunId ? 'subagent' : 'orchestrator';
}

class ConsoleProgressHandler extends BaseCallbackHandler {
  name = 'ConsoleProgressHandler';
  private llmDepth = 0;
  private activeToolName: string | null = null;

  constructor(private readonly verbose: boolean) {
    super();
  }

  private indent(): string {
    return '  '.repeat(Math.max(0, this.llmDepth));
  }

  override handleLLMStart(
    llm: Serialized,
    prompts: string[],
    _runId: string,
    parentRunId?: string,
    extraParams?: Record<string, unknown>,
    tags?: string[],
    metadata?: Record<string, unknown>
  ) {
    this.llmDepth += 1;
    const indent = this.indent();
    const agent = resolveAgentLabel(parentRunId, metadata, tags);
    const model =
      (llm as { kwargs?: { model?: string } }).kwargs?.model ??
      (extraParams?.['model'] as string | undefined) ??
      'unknown-model';

    if (this.verbose) {
      logLine(`${indent}🤖 [${agent}]`, `LLM start (model: ${model})`);
      for (const [i, prompt] of prompts.entries()) {
        logBlock(`${indent}📥 prompt[${i}]`, prompt);
      }
      return;
    }

    const promptHint =
      prompts.length === 1
        ? truncate(prompts[0], 50)
        : `${prompts.length} prompts`;
    logLine(`${indent}🤖 [${agent}]`, `thinking · ${model} · ${promptHint}`);
  }

  override handleLLMEnd(output: LLMResult, runId: string, parentRunId?: string) {
    const indent = this.indent();
    const generation = output.generations?.[0]?.[0];
    const text = generation?.text ?? '';
    const usage =
      output.llmOutput?.['tokenUsage'] ??
      generation?.generationInfo?.['tokenUsage'] ??
      generation?.generationInfo;
    const toolCalls = (generation as { message?: { tool_calls?: { name: string; args: unknown }[] } })
      ?.message?.tool_calls;

    if (this.verbose) {
      logBlock(`${indent}💬 LLM response`, text);
      if (usage != null) {
        logLine(`${indent}📊 tokens`, serializeForLog(usage).replace(/\n/g, ' '));
      }
      if (toolCalls?.length) {
        for (const tc of toolCalls) {
          logLine(
            `${indent}🧰 planned tool`,
            `${tc.name}(${serializeForLog(tc.args).replace(/\n/g, ' ')})`
          );
        }
      }
      this.llmDepth = Math.max(0, this.llmDepth - 1);
      return;
    }

    const parts: string[] = [];
    if (text.trim()) parts.push(`${text.trim().length} chars`);
    const tokenSummary = formatTokenUsage(usage);
    if (tokenSummary) parts.push(tokenSummary);
    if (toolCalls?.length) {
      parts.push(`tools: ${toolCalls.map((tc) => tc.name).join(', ')}`);
    }
    logLine(`${indent}↩`, parts.join(' · ') || 'done');
    this.llmDepth = Math.max(0, this.llmDepth - 1);
  }

  override handleLLMError(err: Error) {
    const indent = this.indent();
    logLine(`${indent}❌ LLM`, err.message);
    this.llmDepth = Math.max(0, this.llmDepth - 1);
  }

  override handleToolStart(
    tool: Serialized,
    input: string,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ) {
    const indent = this.indent();
    const name = resolveToolName(tool, input);
    const agent = resolveAgentLabel(parentRunId, metadata, tags);
    this.activeToolName = name;

    if (this.verbose) {
      logLine(`${indent}🔧 [${agent}] tool start`, name);
      try {
        logBlock(`${indent}↳ input`, JSON.stringify(JSON.parse(input), null, 2));
      } catch {
        logBlock(`${indent}↳ input`, input);
      }
      return;
    }

    let args = '';
    try {
      args = compactJson(JSON.parse(input));
    } catch {
      args = compactJson(input);
    }
    logLine(`${indent}🔧 [${agent}]`, `→ ${name}${args ? ` ${args}` : ''}`);
  }

  override handleToolEnd(
    output: unknown,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ) {
    const indent = this.indent();
    const agent = resolveAgentLabel(parentRunId, metadata, tags);
    const toolLabel = this.activeToolName ?? 'tool';
    this.activeToolName = null;

    if (this.verbose) {
      logLine(`${indent}✅ [${agent}] tool end`, '');
      logBlock(`${indent}↳ output`, serializeForLog(output));
      return;
    }

    logLine(`${indent}✅ [${agent}]`, `✓ ${toolLabel} · ${summarizeOutput(output)}`);
  }

  override handleToolError(
    err: Error,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ) {
    const indent = this.indent();
    const agent = resolveAgentLabel(parentRunId, metadata, tags);
    const toolLabel = this.activeToolName ?? 'tool';
    this.activeToolName = null;
    logLine(`${indent}❌ [${agent}]`, `${toolLabel}: ${err.message}`);
  }

  override handleChainStart(
    chain: Serialized,
    inputs: Record<string, unknown>,
    runId: string,
    parentRunId?: string,
    tags?: string[],
    metadata?: Record<string, unknown>
  ) {
    if (!this.verbose) return;
    const name =
      (chain as { kwargs?: { name?: string } }).kwargs?.name ??
      chain.id?.at(-1) ??
      'chain';
    const indent = parentRunId ? '  ' : '';
    logLine(`${indent}⛓️  chain start`, String(name));
  }

  override handleChainEnd(outputs: Record<string, unknown>) {
    if (!this.verbose) return;
    logLine('', `⛓️  chain end (keys: ${Object.keys(outputs).join(', ') || 'none'})`);
  }

  override handleChainError(err: Error) {
    logLine('❌ chain', err.message);
  }

  override handleAgentAction(action: AgentAction) {
    if (!this.verbose) return;
    logLine(
      '🎯 agent action',
      `${action.tool} ← ${serializeForLog(action.toolInput).replace(/\n/g, ' ')}`
    );
  }
}

/**
 * Extracts plain text from a message content value. Handles both string
 * content and Gemini-style content arrays ({ type: "text", text: string }[]).
 */
export function extractText(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((block) => {
        if (typeof block === 'string') return block;
        if (block && typeof block === 'object' && 'text' in block) {
          return String((block as { text: unknown }).text);
        }
        return '';
      })
      .join('\n');
  }
  return JSON.stringify(content ?? '');
}

export function logMessageTranscript(messages: BaseMessage[], verbose: boolean): void {
  if (!verbose) {
    const types = messages.map((m) => m._getType?.() ?? 'message').join(' → ');
    logLine('📜', `${messages.length} messages: ${types}`);
    return;
  }

  logLine('\n📜', `Message transcript (${messages.length} messages):`);
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    const type = m._getType?.() ?? m.constructor?.name ?? 'message';
    logLine(`  [${i}]`, type);
    logBlock('    content', extractText(m.content));
    if (isAIMessage(m) && m.tool_calls?.length) {
      for (const tc of m.tool_calls) {
        logLine('    tool_call', `${tc.name}(${serializeForLog(tc.args)})`);
      }
    }
  }
}


export interface ToolCallRecord {
  name: string;
  args: unknown;
}

export interface RunResult {
  messages: BaseMessage[];
  toolCalls: ToolCallRecord[];
  solution: TrizSolution | null;
  solutionError?: string;
}

function isEmptyAIMessage(message: BaseMessage | undefined): boolean {
  if (!message || !isAIMessage(message)) return true;
  return extractText(message.content).trim().length === 0;
}

function extractSolutionFromResult(result: {
  messages?: BaseMessage[];
  structuredResponse?: unknown;
}): ParseResult {
  if (result.structuredResponse != null) {
    const direct = TrizSolution.safeParse(result.structuredResponse);
    if (direct.success) return { ok: true, value: direct.data };
  }

  const messages = (result.messages ?? []) as BaseMessage[];
  let lastError: string | undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const attempt = parseSolution(extractText(messages[i]?.content));
    if (attempt.ok && attempt.value) return attempt;
    if (!lastError) lastError = attempt.error;
  }

  const allText = messages.map((m) => extractText(m.content)).join('\n');
  const combined = parseSolution(allText);
  if (combined.ok && combined.value) return combined;

  return { ok: false, error: combined.error ?? lastError };
}

function shouldRetryAgentRun(
  messages: BaseMessage[],
  parsed: ParseResult
): boolean {
  if (parsed.ok) return false;
  const lastAI = [...messages].reverse().find(isAIMessage);
  if (isEmptyAIMessage(lastAI)) return true;
  // Agent produced only a user turn + empty AI — no real work happened.
  return messages.length <= 2;
}

async function invokeAgentWithRetries(
  config: AgentConfig,
  problem: string,
  tools: DynamicStructuredTool[],
  orchestratorPrompt: string,
  subagentPrompts: ReturnType<typeof loadSubagentPrompts>,
  model: string
): Promise<{
  result: Awaited<ReturnType<Awaited<ReturnType<typeof buildAgent>>['invoke']>>;
  solution: TrizSolution | null;
  solutionError?: string;
}> {
  const agent = await buildAgent(
    { ...config, agentModel: model },
    tools,
    orchestratorPrompt,
    subagentPrompts
  );

  let result: Awaited<ReturnType<typeof agent.invoke>>;
  let solution: TrizSolution | null = null;
  let solutionError: string | undefined;
  const RETRY_DELAYS_MS = [10_000, 30_000];

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_DELAYS_MS[attempt - 1];
      logLine(
        '🔁',
        `retry ${attempt + 1}/3 in ${delayMs / 1000}s — ${solutionError ?? 'no solution yet'}`
      );
      await new Promise((r) => setTimeout(r, delayMs));
    } else {
      logLine('▶️', `run ${model}`);
    }

    result = await agent.invoke(
      { messages: [{ role: 'user', content: problem }] },
      { callbacks: [new ConsoleProgressHandler(config.verbose)] }
    );

    const messages = (result!.messages ?? []) as BaseMessage[];
    logLine('⏹️', `done ${model} (attempt ${attempt + 1}/3)`);
    if (config.verbose && result!.structuredResponse != null) {
      logBlock('📦 structuredResponse', serializeForLog(result!.structuredResponse));
    }
    logMessageTranscript(messages, config.verbose);

    const parsed = extractSolutionFromResult(result!);
    if (parsed.ok && parsed.value) {
      solution = parsed.value;
      solutionError = undefined;
      logLine('✅', 'solution parsed');
      break;
    }
    solutionError = parsed.error;
    logLine('⚠️', `no solution: ${truncate(solutionError ?? 'unknown error', 120)}`);
    if (!shouldRetryAgentRun(messages, parsed) || attempt === 2) break;
  }

  return { result: result!, solution, solutionError };
}

export async function runAgent(
  config: AgentConfig,
  problem: string
): Promise<RunResult> {
  await preflightMcpServer(config.mcpServerUrl);

  let toolsBundle: ToolsBundle | undefined;
  try {
    toolsBundle = await buildTools(config.mcpServerUrl);
    logLine(
      '🧰',
      `${toolsBundle.tools.length} tools: ${toolsBundle.tools.map((t) => t.name).join(', ')}`
    );

    const orchestratorPrompt = loadSystemPrompt();
    const subagentPrompts = loadSubagentPrompts();

    const modelsToTry = [config.agentModel];
    if (config.fallbackAgentModel !== config.agentModel) {
      modelsToTry.push(config.fallbackAgentModel);
    }

    let result: Awaited<ReturnType<Awaited<ReturnType<typeof buildAgent>>['invoke']>>;
    let solution: TrizSolution | null = null;
    let solutionError: string | undefined;

    for (const model of modelsToTry) {
      if (model !== config.agentModel) {
        logLine('🔄', `fallback → ${model}`);
      }

      const attempt = await invokeAgentWithRetries(
        config,
        problem,
        toolsBundle.tools,
        orchestratorPrompt,
        subagentPrompts,
        model
      );
      result = attempt.result;
      solution = attempt.solution;
      solutionError = attempt.solutionError;

      if (solution) break;

      const messages = (result.messages ?? []) as BaseMessage[];
      const stalled = shouldRetryAgentRun(messages, {
        ok: false,
        error: solutionError,
      });
      if (!stalled) break;
    }

    const messages = (result!.messages ?? []) as BaseMessage[];
    const toolCalls: ToolCallRecord[] = messages
      .filter(isAIMessage)
      .flatMap((m) =>
        (m.tool_calls ?? []).map((tc) => ({ name: tc.name, args: tc.args }))
      );

    return { messages, toolCalls, solution, solutionError };
  } finally {
    if (toolsBundle) {
      await closeTools(toolsBundle);
    }
  }
}
