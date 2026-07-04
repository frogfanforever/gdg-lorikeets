/**
 * Environment configuration for the solver-agent CLI runner.
 * Loaded from `.env` (via dotenv) and `process.env`.
 */
import { config as loadDotenv } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * `nx serve` / `node dist/apps/solver-agent/main.js` are run from the
 * `solvermaster/` workspace root, so plain `dotenv/config` (which loads
 * `.env` from `process.cwd()`) would miss `apps/solver-agent/.env`. Look
 * there first, falling back to a plain `.env` at the cwd.
 */
function loadEnvFile(): void {
  const candidates = [
    resolve(process.cwd(), 'apps/solver-agent/.env'),
    resolve(process.cwd(), '.env'),
  ];

  const envPath = candidates.find((candidate) => existsSync(candidate));
  if (envPath) {
    loadDotenv({ path: envPath });
  }
}

loadEnvFile();

export interface AgentConfig {
  googleApiKey: string;
  mcpServerUrl: string;
  agentModel: string;
  fallbackAgentModel: string;
  /** When true, log full prompts, tool I/O, and message transcripts. */
  verbose: boolean;
}

const DEFAULT_MCP_SERVER_URL = 'http://localhost:8123/mcp';
const DEFAULT_AGENT_MODEL = 'gemini-2.5-pro';
const DEFAULT_FALLBACK_AGENT_MODEL = 'gemini-2.5-pro';

export function loadConfig(): AgentConfig {
  const googleApiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

  if (!googleApiKey) {
    throw new Error(
      'Missing GOOGLE_GENERATIVE_AI_API_KEY. Set it in apps/solver-agent/.env ' +
        '(copy from .env.example) or export it in your shell before running ' +
        '"npx nx serve solver-agent".'
    );
  }

  return {
    googleApiKey,
    mcpServerUrl: process.env.MCP_SERVER_URL ?? DEFAULT_MCP_SERVER_URL,
    agentModel: process.env.AGENT_MODEL ?? DEFAULT_AGENT_MODEL,
    fallbackAgentModel:
      process.env.AGENT_FALLBACK_MODEL ?? DEFAULT_FALLBACK_AGENT_MODEL,
    verbose: process.env.AGENT_VERBOSE === '1',
  };
}
