import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Param, Principle, SessionState, UiDirective } from './models';

/** Global signal store for the solver flow: current session + busy/error, shared
 *  across the page features. The shell reads `busy` to show the loader overlay.
 *  All state is derived from the real solver-api session — no fabricated data. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(ApiService);

  readonly session = signal<SessionState | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  /** 0-based stepper index (Problem, Methods, Analysis, Shortlist, Result). */
  readonly stepIndex = signal(0);

  /** Furthest step reached in this session — every step up to this is revisitable. */
  readonly maxStep = signal(0);

  /** Route the agent last asked the FE to show; the shell navigates to it. */
  readonly pendingRoute = signal<string | null>(null);

  /** True while the agent runs (socket flow) — the FE does not block on it. */
  readonly agentRunning = signal(false);

  /** Automode: the agent drives the flow end-to-end, so manual "next" buttons
   *  (past the first submit) stay disabled. Always on. */
  readonly automode = signal(true);

  /** Principle ids the expert carries forward to the recommendation. */
  readonly selected = signal<Set<number>>(new Set());

  readonly hasSession = computed(() => this.session() !== null);

  // ---- live views of the session (null/empty until the relevant step runs) ----
  readonly analysis = computed(() => this.session()?.analysis ?? null);
  readonly parameters = computed(() => this.session()?.parameters ?? null);
  readonly principles = computed<Principle[]>(() => this.session()?.matrix?.principles ?? []);
  readonly recommendation = computed(() => this.session()?.recommendation ?? null);
  readonly decisionTrace = computed<string[]>(() => this.session()?.decision_trace ?? []);

  private run<T extends SessionState>(obs: Observable<T>): Observable<T> {
    this.busy.set(true);
    this.error.set('');
    return obs.pipe(
      tap({
        next: (s) => { this.session.set(s); this.busy.set(false); },
        error: (e) => { this.error.set(e?.error?.message || e?.error?.error || e?.message || 'request failed'); this.busy.set(false); },
      }),
    );
  }

  createSession(problem: { title?: string; statement: string }) {
    this.selected.set(new Set());
    return this.run(this.api.createSession(problem));
  }
  analyze() { return this.run(this.api.analyze(this.id())); }
  setParameters(improving: number, preserving: number) { return this.run(this.api.setParameters(this.id(), improving, preserving)); }
  matrix() { return this.run(this.api.matrix(this.id())); }
  recommend(ids: number[]) { return this.run(this.api.recommend(this.id(), ids)); }

  /** Default the carried-forward selection to every principle the matrix returned. */
  selectAllPrinciples() {
    this.selected.set(new Set(this.principles().map((p) => p.id)));
  }
  toggleSelected(id: number) {
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  setStep(i: number) { this.stepIndex.set(i); if (i > this.maxStep()) this.maxStep.set(i); }
  reset() { this.session.set(null); this.error.set(''); this.stepIndex.set(0); this.maxStep.set(0); this.selected.set(new Set()); this.pendingRoute.set(null); this.agentRunning.set(false); }

  // ---- socket / agent-driven flow ----

  /** Called when the user submits the problem (first "Dalej"). */
  beginSolve(problem: { title?: string; statement: string }) {
    this.reset();
    this.selected.set(new Set());
    this.busy.set(true);
    this.agentRunning.set(true);
    // seed the problem so the problem screen keeps its text while the agent starts
    this.session.set({
      session_id: '', problem, analysis: null, parameters: null, matrix: null,
      selected_principle_ids: null, recommendation: null, decision_trace: [], metadata: {},
    });
  }

  /** Apply a `ui:show` directive: merge session, move the stepper, request navigation. */
  applyDirective(d: UiDirective) {
    this.busy.set(false);
    this.mergeSession(d.session);
    this.setStep(d.step);
    this.pendingRoute.set(d.route);
  }

  /** Agent finished: apply the final session snapshot. */
  applyDone(session: SessionState) {
    this.busy.set(false);
    this.agentRunning.set(false);
    this.mergeSession(session);
  }

  setSocketError(message: string) {
    this.busy.set(false);
    this.agentRunning.set(false);
    this.error.set(message);
  }

  /** Merge an incoming snapshot over the current one, keeping already-populated
   *  fields when the new snapshot omits them. This guarantees the final
   *  `solve:done` (or any later directive) never resets the flow to a clear
   *  state — completed results stay on screen. */
  private mergeSession(s: SessionState) {
    const prev = this.session();
    const merged: SessionState = {
      session_id: s.session_id || prev?.session_id || '',
      problem: s.problem ?? prev?.problem ?? { statement: '' },
      analysis: s.analysis ?? prev?.analysis ?? null,
      parameters: s.parameters ?? prev?.parameters ?? null,
      matrix: s.matrix ?? prev?.matrix ?? null,
      selected_principle_ids: s.selected_principle_ids ?? prev?.selected_principle_ids ?? null,
      recommendation: s.recommendation ?? prev?.recommendation ?? null,
      decision_trace: s.decision_trace?.length ? s.decision_trace : prev?.decision_trace ?? [],
      metadata: s.metadata ?? prev?.metadata ?? {},
    };
    this.session.set(merged);
    if (s.selected_principle_ids?.length) {
      this.selected.set(new Set(s.selected_principle_ids));
    }
  }

  /** Options for a parameter picker: the chosen param first, then its alternatives. */
  paramOptions(side: 'improving' | 'preserving'): Param[] {
    const chosen = this.parameters()?.[side];
    const suggested = this.analysis()?.[side];
    const alts = suggested?.alternatives ?? [];
    const all = [chosen, suggested, ...alts].filter((p): p is Param => !!p);
    const seen = new Set<number>();
    return all.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
  }

  private id(): string {
    const s = this.session();
    if (!s) throw new Error('no active session');
    return s.session_id;
  }
}
