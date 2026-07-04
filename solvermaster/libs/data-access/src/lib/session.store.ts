import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { Candidate, SessionState } from './models';

const EXAMPLE_CANDIDATES: Candidate[] = [
  { name: 'Materiały kompozytowe', tag: 'TRIZ', scores: { e: 5, i: 4, z: 2, w: 3 } },
  { name: 'Segmentacja', tag: 'TRIZ', scores: { e: 3, i: 3, z: 4, w: 5 } },
  { name: 'SCAMPER: Combine', tag: 'SCMP', scores: { e: 4, i: 5, z: 3, w: 2 } },
  { name: 'Koncept własny', tag: 'TY', scores: { e: 4, i: 4, z: 4, w: 4 } },
];

const score = (id: number, mult: number) => 2 + ((id * mult) % 4); // deterministic 2..5

/** Global signal store for the solver flow: current session + busy/error, shared
 *  across the page features. The shell reads `busy` to show the loader overlay. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(ApiService);

  readonly session = signal<SessionState | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  /** 0-based stepper index (Problem, Methods, Analysis, Shortlist, Result). */
  readonly stepIndex = signal(0);

  readonly hasSession = computed(() => this.session() !== null);

  /** Candidate pool for evaluation/choice — from the matrix principles (TRIZ) plus a
   *  SCAMPER + own-concept stand-in; falls back to the design's example set. */
  readonly candidates = computed<Candidate[]>(() => {
    const principles = this.session()?.matrix?.principles ?? [];
    if (!principles.length) return EXAMPLE_CANDIDATES;
    const triz: Candidate[] = principles.slice(0, 3).map((p) => ({
      name: p.name,
      tag: 'TRIZ' as const,
      scores: { e: score(p.id, 7), i: score(p.id, 13), z: score(p.id, 17), w: score(p.id, 23) },
    }));
    return [
      ...triz,
      { name: 'SCAMPER: Combine', tag: 'SCMP', scores: { e: 4, i: 5, z: 3, w: 2 } },
      { name: 'Koncept własny', tag: 'TY', scores: { e: 4, i: 4, z: 4, w: 4 } },
    ];
  });

  private run<T extends SessionState>(obs: Observable<T>): Observable<T> {
    this.busy.set(true);
    this.error.set('');
    return obs.pipe(
      tap({
        next: (s) => { this.session.set(s); this.busy.set(false); },
        error: (e) => { this.error.set(e?.error?.error || e?.message || 'request failed'); this.busy.set(false); },
      }),
    );
  }

  createSession(problem: { title?: string; statement: string }) {
    return this.run(this.api.createSession(problem));
  }
  analyze() { return this.run(this.api.analyze(this.id())); }
  setParameters(improving: number, preserving: number) { return this.run(this.api.setParameters(this.id(), improving, preserving)); }
  matrix() { return this.run(this.api.matrix(this.id())); }
  recommend(ids: number[]) { return this.run(this.api.recommend(this.id(), ids)); }

  setStep(i: number) { this.stepIndex.set(i); }
  reset() { this.session.set(null); this.error.set(''); this.stepIndex.set(0); }

  private id(): string {
    const s = this.session();
    if (!s) throw new Error('no active session');
    return s.session_id;
  }
}
