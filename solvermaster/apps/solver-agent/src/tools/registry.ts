/**
 * Aggregates all tools exposed to the agent. MVP: TRIZ MCP tools only.
 */
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { loadTrizMcpTools, TrizMcpConnection } from './mcp-triz';

export interface ToolsBundle {
  tools: DynamicStructuredTool[];
  connections: TrizMcpConnection[];
}

export async function buildTools(mcpServerUrl: string): Promise<ToolsBundle> {
  const trizConnection = await loadTrizMcpTools(mcpServerUrl);

  return {
    tools: [...trizConnection.tools],
    connections: [trizConnection],
  };
}

export async function closeTools(bundle: ToolsBundle): Promise<void> {
  await Promise.all(bundle.connections.map((c) => c.client.close()));
}
