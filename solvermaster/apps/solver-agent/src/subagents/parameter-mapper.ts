import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { SubAgent } from 'deepagents';

const ALLOWED_TOOLS = new Set(['search_parameter', 'get_parameter_by_id']);

export function buildParameterMapper(
  mcpTools: DynamicStructuredTool[],
  systemPrompt: string
): SubAgent {
  return {
    name: 'parameter-mapper',
    description:
      'Maps a free-text engineering problem to TRIZ parameter IDs (1–39) and identifies technical contradictions (improving vs. worsening parameter pairs). Delegate to this subagent first when you have a new problem to analyse.',
    systemPrompt,
    tools: mcpTools.filter((t) => ALLOWED_TOOLS.has(t.name)),
  };
}
