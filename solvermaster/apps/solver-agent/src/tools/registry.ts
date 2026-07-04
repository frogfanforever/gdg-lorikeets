/**
 * Aggregates all tools exposed to the agent: TRIZ MCP + UI component stubs.
 */
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { loadTrizMcpTools, TrizMcpConnection } from './mcp-triz';
import { buildUiComponentTools } from './ui-components';

export interface ToolsBundle {
  tools: DynamicStructuredTool[];
  connections: TrizMcpConnection[];
}

export async function buildTools(mcpServerUrl: string): Promise<ToolsBundle> {
  const trizConnection = await loadTrizMcpTools(mcpServerUrl);
  const uiTools = buildUiComponentTools();

  return {
    tools: [...trizConnection.tools, ...uiTools],
    connections: [trizConnection],
  };
}

export async function closeTools(bundle: ToolsBundle): Promise<void> {
  await Promise.all(bundle.connections.map((c) => c.client.close()));
}
