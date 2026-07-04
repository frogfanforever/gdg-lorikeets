import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { SubAgent } from 'deepagents';
import { TrizSolution } from '../schema';

const ALLOWED_TOOLS = new Set(['get_principle_by_id']);

export function buildSolutionSynthesizer(
  mcpTools: DynamicStructuredTool[],
  systemPrompt: string
): SubAgent {
  return {
    name: 'solution-synthesizer',
    description:
      'Given a technical contradiction and candidate Inventive Principles, produces concrete practical proposals for each principle and writes an English-language summary. Delegate to this subagent last, after you have both the contradiction and the candidate principles.',
    systemPrompt,
    tools: mcpTools.filter((t) => ALLOWED_TOOLS.has(t.name)),
    responseFormat: TrizSolution,
  };
}
