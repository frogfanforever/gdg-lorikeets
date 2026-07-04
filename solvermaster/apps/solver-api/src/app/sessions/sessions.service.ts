import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EngineClient } from '../domain/engine.client';
import { Session, SessionStore } from './session.store';

const VERSION_LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

@Injectable()
export class SessionsService {
  constructor(private readonly store: SessionStore, private readonly engine: EngineClient) {}

  private require(id: string): Session {
    const s = this.store.get(id);
    if (!s) throw new NotFoundException(`session ${id} not found`);
    return s;
  }

  create(body: any) {
    const statement = (body?.problem?.statement || '').trim();
    if (!statement) throw new BadRequestException('problem.statement is required');
    const s = this.store.create({
      title: body.problem.title, statement, sdg: body.problem.sdg ?? null,
    });
    return this.view(s);
  }

  async analyze(id: string) {
    const s = this.require(id);
    const t0 = performance.now();
    const analysis = await this.engine.analyze(s.problem.title ?? '', s.problem.statement);
    s.analysis = analysis;
    // seed the chosen parameters with the agent's top picks (expert can override)
    if (analysis?.improving && analysis?.preserving) {
      s.parameters = {
        improving: { id: analysis.improving.id, name: analysis.improving.name },
        preserving: { id: analysis.preserving.id, name: analysis.preserving.name },
      };
    }
    s.matrix = undefined; s.recommendation = undefined; s.selected_principle_ids = undefined;
    this.store.record(id, 'analyze', analysis, Math.round(performance.now() - t0));
    return this.view(s);
  }

  async setParameters(id: string, body: any) {
    const s = this.require(id);
    const impId = Number(body?.improving?.id ?? body?.improving);
    const preId = Number(body?.preserving?.id ?? body?.preserving);
    if (!impId || !preId) throw new BadRequestException('improving and preserving parameter ids required');
    const t0 = performance.now();
    const [imp, pre] = await Promise.all([this.engine.getParameter(impId), this.engine.getParameter(preId)]);
    s.parameters = { improving: { id: imp.id, name: imp.name }, preserving: { id: pre.id, name: pre.name } };
    s.matrix = undefined; s.recommendation = undefined; s.selected_principle_ids = undefined; // invalidate downstream
    this.store.record(id, 'parameters', s.parameters, Math.round(performance.now() - t0));
    return this.view(s);
  }

  async matrix(id: string) {
    const s = this.require(id);
    if (!s.parameters) throw new BadRequestException('set parameters first (analyze or PUT /parameters)');
    const t0 = performance.now();
    const matrix = await this.engine.matrixCell(s.parameters.improving.id, s.parameters.preserving.id);
    s.matrix = matrix; s.recommendation = undefined;
    this.store.record(id, 'matrix', matrix, Math.round(performance.now() - t0));
    return this.view(s);
  }

  async recommendation(id: string, body: any) {
    const s = this.require(id);
    if (!s.parameters) throw new BadRequestException('set parameters and run matrix first');
    const ids: number[] = (body?.selected_principle_ids || []).map(Number).filter(Boolean);
    if (!ids.length) throw new BadRequestException('selected_principle_ids (non-empty) required');
    const t0 = performance.now();
    const rec = await this.engine.recommend(s.parameters.improving.name, s.parameters.preserving.name, ids);
    s.selected_principle_ids = ids;
    s.recommendation = rec;
    const label = VERSION_LABELS[s.versions.length] ?? String(s.versions.length + 1);
    s.versions.push({ version: label, parameters: s.parameters, selected_principle_ids: ids, recommendation: rec });
    this.store.record(id, 'recommendation', { version: label, ...rec }, Math.round(performance.now() - t0));
    return this.view(s);
  }

  get(id: string) {
    return this.view(this.require(id));
  }

  versions(id: string) {
    return { versions: this.require(id).versions };
  }

  // ---- presentation ----
  private view(s: Session) {
    const principlesFound = (s.matrix as any)?.principles?.length ?? 0;
    const principlesApplied = (s.recommendation as any)?.applied_principle_ids?.length ?? 0;
    return {
      session_id: s.id,
      problem: s.problem,
      analysis: s.analysis ?? null,
      parameters: s.parameters ?? null,
      matrix: s.matrix ?? null,
      selected_principle_ids: s.selected_principle_ids ?? null,
      recommendation: s.recommendation ?? null,
      decision_trace: this.trace(s),
      metadata: {
        parameters_recognized: s.parameters ? 2 : 0,
        matrix_hits: principlesFound > 0 ? 1 : 0,
        principles_found: principlesFound,
        principles_applied: principlesApplied,
        version: s.versions.at(-1)?.version ?? null,
      },
      steps: s.steps,
    };
  }

  private trace(s: Session): string[] {
    const t: string[] = [`Problem → ${s.problem.title ?? s.problem.statement.slice(0, 40)}`];
    if (s.parameters) t.push(`Contradiction → ${s.parameters.improving.name} (${s.parameters.improving.id}) vs ${s.parameters.preserving.name} (${s.parameters.preserving.id})`);
    if ((s.matrix as any)?.principles) t.push(`Matrix ${s.parameters?.improving.id}×${s.parameters?.preserving.id} → ${(s.matrix as any).principles.length} principles (${(s.matrix as any).principles.map((p: any) => p.id).join(', ')})`);
    if (s.selected_principle_ids) t.push(`Selected for recommendation: ${s.selected_principle_ids.join(', ')}`);
    return t;
  }
}
