/**
 * Per-run state shared between the engine-backed TRIZ tools (which populate it
 * as the agent looks things up) and the UI `show_*` tools (which emit it to the
 * frontend). One RunContext per socket solve request.
 */
import {
  COMPONENT_ROUTES,
  Param,
  Principle,
  SessionSnapshot,
  UiComponent,
  UiDirective,
} from './contract';

export type EmitFn = (directive: UiDirective) => void;

export class RunContext {
  readonly session: SessionSnapshot;

  constructor(
    readonly sessionId: string,
    problem: { title?: string; statement: string },
    private readonly emitFn: EmitFn,
  ) {
    this.session = {
      session_id: sessionId,
      problem,
      analysis: null,
      parameters: null,
      matrix: null,
      selected_principle_ids: null,
      recommendation: null,
      decision_trace: [`Problem → ${problem.title ?? problem.statement.slice(0, 48)}`],
    };
  }

  private trace(line: string): void {
    if (!this.session.decision_trace.includes(line)) {
      this.session.decision_trace.push(line);
    }
  }

  /** Record the contradiction (improving/worsening) once the matrix is browsed. */
  setContradiction(improving: Param, preserving: Param): void {
    this.session.parameters = { improving, preserving };
    this.session.analysis = { improving, preserving };
    this.trace(
      `Contradiction → ${improving.name} (${improving.id}) vs ${preserving.name} (${preserving.id})`,
    );
  }

  setPrinciples(improvingId: number, preservingId: number, principles: Principle[]): void {
    this.session.matrix = {
      cell: { improving_id: improvingId, preserving_id: preservingId },
      principles,
    };
    if (!this.session.selected_principle_ids) {
      this.session.selected_principle_ids = principles.map((p) => p.id);
    }
    this.trace(
      `Matrix ${improvingId}×${preservingId} → ${principles.length} principles (${principles
        .map((p) => p.id)
        .join(', ')})`,
    );
  }

  setRecommendation(text: string, appliedIds: number[]): void {
    this.session.recommendation = { text, applied_principle_ids: appliedIds };
    this.session.selected_principle_ids = appliedIds;
    this.trace(`Selected for recommendation: ${appliedIds.join(', ')}`);
  }

  /** Emit a `ui:show` directive for the given component with the current snapshot. */
  show(component: UiComponent, payload?: unknown): void {
    const { route, step } = COMPONENT_ROUTES[component];
    this.emitFn({
      sessionId: this.sessionId,
      component,
      route,
      step,
      session: this.snapshot(),
      payload,
    });
  }

  /** Deep-ish copy so late mutations don't retroactively change emitted frames. */
  snapshot(): SessionSnapshot {
    return JSON.parse(JSON.stringify(this.session)) as SessionSnapshot;
  }
}
