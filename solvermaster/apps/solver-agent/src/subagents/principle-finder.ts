import type { DynamicStructuredTool } from '@langchain/core/tools';
import type { SubAgent } from 'deepagents';

const ALLOWED_TOOLS = new Set([
  'browse_contradiction_matrix',
  'get_principle_by_id',
  'search_principle',
]);

export function buildPrincipleFinder(
  mcpTools: DynamicStructuredTool[],
  systemPrompt: string
): SubAgent {
  return {
    name: 'principle-finder',
    description:
      'Looks up the TRIZ contradiction matrix for given parameter ID pairs and returns a ranked list of candidate Inventive Principles. Delegate to this subagent after you have the contradiction parameter IDs from parameter-mapper.',
    systemPrompt,
    tools: mcpTools.filter((t) => ALLOWED_TOOLS.has(t.name)),
  };
}
