/**
 * Runs the solver-agent (Deep Agent: orchestrator + subagents) in-process.
 *
 * No CLI, no MCP: TRIZ tools call the pytriz engine directly (EngineClient) and
 * UI `show_*` tools emit socket directives via the RunContext. Long-running —
 * the gateway calls this fire-and-forget so the FE never blocks on it.
 */
import { Injectable, Logger } from '@nestjs/common';
import {
  buildAgent,
  loadConfig,
  loadSubagentPrompts,
  loadSystemPrompt,
  parseSolution,
  TrizSolution,
  type AgentConfig,
} from '@solvermaster/agent';
import { EngineClient } from '../domain/engine.client';
import { SessionSnapshot } from './contract';
import { RunContext, EmitFn } from './run-context';
import { buildEngineTrizTools } from './triz-tools';
import { buildUiComponentTools } from './ui-tools';

export interface RunParams {
  sessionId: string;
  problem: { title?: string; statement: string };
  emit: EmitFn;
  onDone: (session: SessionSnapshot) => void;
  onError: (message: string) => void;
}

@Injectable()
export class AgentRunnerService {
  private readonly log = new Logger('AgentRunner');
  private config: AgentConfig | null = null;

  private getConfig(): AgentConfig {
    if (!this.config) {
      this.config = loadConfig();
      // Engine-backed tools have clean JSON schemas (no MCP), so the plain
      // Gemini client is enough — avoid the @h1deya ESM-only fallback import.
      process.env.USE_GEMINI_EX = '0';
    }
    return this.config;
  }

  /** Fire-and-forget: kick off the agent, stream UI directives, resolve later. */
  run(params: RunParams): void {
    void this.execute(params).catch((err) => {
      this.log.error(`agent run failed: ${(err as Error).message}`);
      params.onError((err as Error).message || 'agent run failed');
    });
  }

  private async execute(params: RunParams): Promise<void> {
    const { sessionId, problem, emit, onDone } = params;
    const config = this.getConfig();
    const ctx = new RunContext(sessionId, problem, emit);

    const tools = [
      ...buildEngineTrizTools(this.engine, ctx),
      ...buildUiComponentTools(ctx),
    ];
    const orchestratorPrompt = loadSystemPrompt();
    const subagentPrompts = loadSubagentPrompts();

    // Guarantee the opening frame so the FE always leaves the input screen,
    // then let the agent drive the rest via its show_* tools.
    ctx.show('problem-description');

    // flash occasionally returns an empty turn; fall back to the pro model
    // (mirrors the CLI runner's retry strategy) so the flow completes.
    const models = [config.agentModel];
    if (config.fallbackAgentModel && config.fallbackAgentModel !== config.agentModel) {
      models.push(config.fallbackAgentModel);
    }

    let result: any = null;
    for (const model of models) {
      this.log.log(`▶ agent start · session=${sessionId} · model=${model}`);
      const agent = await buildAgent(
        { ...config, agentModel: model },
        tools,
        orchestratorPrompt,
        subagentPrompts,
      );
      result = await agent.invoke({
        messages: [{ role: 'user', content: problem.statement }],
      });
      if (!this.stalled(result)) break;
      this.log.warn(`agent stalled on ${model}; trying fallback`);
    }

    this.applySolution(ctx, result);
    onDone(ctx.snapshot());
    this.log.log(`⏹ agent done · session=${sessionId}`);
  }

  /** True when the model produced no useful turn (empty response, no tool calls). */
  private stalled(result: any): boolean {
    const messages: any[] = result?.messages ?? [];
    if (messages.length <= 2) return true;
    const hadToolCall = messages.some((m) => Array.isArray(m?.tool_calls) && m.tool_calls.length);
    return !hadToolCall && !this.extractSolution(result);
  }

  /** Map the agent's TrizSolution into a recommendation + final evaluation frame. */
  private applySolution(ctx: RunContext, result: any): void {
    const solution = this.extractSolution(result);
    if (!solution) {
      // Still surface whatever the agent produced (e.g. matrix principles).
      ctx.show('evaluation');
      return;
    }

    const appliedIds = solution.proposed_principles.map((p) => p.id);

    // Backfill matrix principles whenever the session has none yet — either the
    // agent never browsed the matrix, or the engine was unavailable and returned
    // an empty cell. Use the principles the LLM proposed so the
    // generation/shortlist screen and the result are never left empty.
    if (!ctx.session.matrix?.principles?.length && solution.contradictions[0]) {
      const c = solution.contradictions[0];
      if (!ctx.session.parameters) {
        ctx.setContradiction(c.improving_parameter, c.worsening_parameter);
      }
      ctx.setPrinciples(
        c.improving_parameter.id,
        c.worsening_parameter.id,
        solution.proposed_principles.map((p) => ({ id: p.id, name: p.name, description: p.application })),
      );
    }

    const applications = solution.proposed_principles
      .map((p) => `• [${p.id}] ${p.name}: ${p.application}`)
      .join('\n');
    const text = [solution.summary, applications].filter(Boolean).join('\n\n');

    ctx.setRecommendation(text, appliedIds);
    ctx.show('evaluation');
  }

  private extractSolution(result: any): TrizSolution | null {
    if (result?.structuredResponse != null) {
      const direct = TrizSolution.safeParse(result.structuredResponse);
      if (direct.success) return direct.data;
    }
    const messages: any[] = result?.messages ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
      const content = messages[i]?.content;
      const text = typeof content === 'string' ? content : JSON.stringify(content ?? '');
      const parsed = parseSolution(text);
      if (parsed.ok && parsed.value) return parsed.value;
    }
    return null;
  }

  constructor(private readonly engine: EngineClient) {}
}
