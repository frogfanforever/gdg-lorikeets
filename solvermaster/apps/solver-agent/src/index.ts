/**
 * Public surface of solver-agent, consumed in-process by solver-api.
 *
 * solver-api imports these building blocks to run the Deep Agent itself
 * (no CLI, no MCP): it supplies engine-backed TRIZ tools + socket-emitting
 * UI tools and drives the orchestrator/subagents directly.
 */
export { buildAgent } from './agent';
export {
  loadSystemPrompt,
  loadSubagentPrompts,
  loadPrompt,
} from './prompts/loader';
export type { SubagentPrompts } from './prompts/loader';
export { loadConfig } from './config';
export type { AgentConfig } from './config';
export {
  TrizSolution,
  ContradictionMapping,
  PrincipleCandidates,
  parseSolution,
} from './schema';
export type { ParseResult } from './schema';
