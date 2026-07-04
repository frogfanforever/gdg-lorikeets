/**
 * Connects to the external TRIZ MCP server (pytriz, Streamable HTTP) and
 * exposes its tools as LangChain-compatible `DynamicStructuredTool`s.
 *
 * The MCP server itself is NOT part of this repo — see the workshop repo
 * (gdg-mcp-workshop) for `mcp-server/app/main.py`.
 *
 * Expected tools exposed by pytriz's FastMCP server:
 *   browse_contradiction_matrix, get_principle_by_id, get_parameter_by_id,
 *   get_random_principles, search_parameter, search_principle
 */
import { MultiServerMCPClient } from '@langchain/mcp-adapters';
import type { DynamicStructuredTool } from '@langchain/core/tools';

export interface TrizMcpConnection {
  client: MultiServerMCPClient;
  tools: DynamicStructuredTool[];
}

const TRIZ_SERVER_NAME = 'triz';

export async function loadTrizMcpTools(
  mcpServerUrl: string
): Promise<TrizMcpConnection> {
  const client = new MultiServerMCPClient({
    [TRIZ_SERVER_NAME]: { transport: 'http', url: mcpServerUrl },
  });

  const tools = await client.getTools();
  return { client, tools };
}

/**
 * Lightweight reachability check for the MCP server, so failures surface as a
 * clear error before the (slower, billed) LLM call is attempted.
 */
export async function preflightMcpServer(mcpServerUrl: string): Promise<void> {
  try {
    const response = await fetch(mcpServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 0,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'solver-agent-preflight', version: '0.0.0' },
        },
      }),
    });

    if (!response.ok && response.status !== 400) {
      throw new Error(`MCP server responded with HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Cannot reach TRIZ MCP server at ${mcpServerUrl}. Make sure it is running ` +
        `(see gdg-mcp-workshop/mcp-server) before starting solver-agent.\n` +
        `Original error: ${(error as Error).message}`
    );
  }
}
