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
import type { LLMResult } from '@langchain/core/outputs';

class ConsoleProgressHandler extends BaseCallbackHandler {
  name = 'ConsoleProgressHandler';

  override handleLLMStart(_llm: Serialized, _prompts: string[], runId: string, parentRunId?: string) {
    if (!parentRunId) {
      process.stdout.write('\n🤖 [orchestrator] thinking...\n');
    } else {
      process.stdout.write('  🤖 [subagent] thinking...\n');
    }
  }

  override handleLLMEnd(output: LLMResult) {
    const text = output.generations?.[0]?.[0]?.text;
    if (text && text.trim()) {
      const preview = text.trim().slice(0, 120).replace(/\n/g, ' ');
      process.stdout.write(`  💬 ${preview}${text.length > 120 ? '…' : ''}\n`);
    }
  }

  override handleToolStart(_tool: Serialized, input: string) {
    const t = _tool as { name?: string; id?: string[] };
    const name = t.name ?? t.id?.at(-1) ?? '?';
    try {
      const parsed = JSON.parse(input);
      process.stdout.write(`  🔧 tool: ${name} ${JSON.stringify(parsed)}\n`);
    } catch {
      process.stdout.write(`  🔧 tool: ${name} ${input}\n`);
    }
  }

  override handleToolEnd(output: unknown) {
    const str =
      typeof output === 'string'
        ? output
        : JSON.stringify(output);
    const preview = str.trim().slice(0, 100).replace(/\n/g, ' ');
    process.stdout.write(`  ✅ result: ${preview}${str.length > 100 ? '…' : ''}\n`);
  }

  override handleToolError(err: Error) {
    process.stdout.write(`  ❌ tool error: ${err.message}\n`);
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
import { AgentConfig } from './config';
import { loadSystemPrompt, loadSubagentPrompts } from './prompts/loader';
import { preflightMcpServer } from './tools/mcp-triz';
import { buildTools, closeTools, ToolsBundle } from './tools/registry';
import { buildAgent } from './agent';
import { TrizSolution, parseSolution } from './schema';

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

export async function runAgent(
  config: AgentConfig,
  problem: string
): Promise<RunResult> {
  await preflightMcpServer(config.mcpServerUrl);

  let toolsBundle: ToolsBundle | undefined;
  try {
    toolsBundle = await buildTools(config.mcpServerUrl);

    const orchestratorPrompt = loadSystemPrompt();
    const subagentPrompts = loadSubagentPrompts();

    const agent = await buildAgent(
      config,
      toolsBundle.tools,
      orchestratorPrompt,
      subagentPrompts
    );

    // Retry up to 3 times if Gemini returns an empty AI response (0 output
    // tokens). This can happen when gemini-2.5-flash is rate-limited or
    // exhausts its thinking budget. Delays are intentionally long (10s / 30s)
    // so that a per-minute rate-limit window can reset between attempts.
    let result: Awaited<ReturnType<typeof agent.invoke>>;
    const RETRY_DELAYS_MS = [10_000, 30_000];
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAYS_MS[attempt - 1]));
      }
      result = await agent.invoke(
        { messages: [{ role: 'user', content: problem }] },
        { callbacks: [new ConsoleProgressHandler()] }
      );
      const msgs = (result!.messages ?? []) as BaseMessage[];
      const lastAI = [...msgs].reverse().find(isAIMessage);
      const isEmpty =
        !lastAI ||
        (Array.isArray(lastAI.content) && lastAI.content.length === 0) ||
        lastAI.content === '';
      if (!isEmpty) break;
    }

    const messages = (result!.messages ?? []) as BaseMessage[];
    const toolCalls: ToolCallRecord[] = messages
      .filter(isAIMessage)
      .flatMap((m) =>
        (m.tool_calls ?? []).map((tc) => ({ name: tc.name, args: tc.args }))
      );

    // Scan messages from last to first for a ```json TrizSolution block.
    // The orchestrator sometimes summarises rather than embedding the JSON,
    // so the authoritative block may be in the solution-synthesizer tool result.
    let solution: TrizSolution | null = null;
    let solutionError: string | undefined;
    for (let i = messages.length - 1; i >= 0; i--) {
      const text = extractText(messages[i]?.content);
      const attempt = parseSolution(text);
      if (attempt.ok && attempt.value) { solution = attempt.value; break; }
      if (!solutionError) solutionError = attempt.error;
    }
    if (!solution) {
      // Collect all text and try once more (handles split content arrays).
      const allText = messages.map((m) => extractText(m?.content)).join('\n');
      const attempt = parseSolution(allText);
      if (attempt.ok && attempt.value) { solution = attempt.value; solutionError = undefined; }
      else solutionError = attempt.error;
    }

    return { messages, toolCalls, solution, solutionError };
  } finally {
    if (toolsBundle) {
      await closeTools(toolsBundle);
    }
  }
}
