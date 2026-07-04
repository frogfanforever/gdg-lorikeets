import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { ApiService } from './api.service';
import { SessionState } from './models';

/** Global signal store for the solver flow: current session + busy/error, shared
 *  across the page features. The shell reads `busy` to show the loader overlay. */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly api = inject(ApiService);

  readonly session = signal<SessionState | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  /** 0-based stepper index (Contradiction, Mapping, Generation, Evaluation, Choice). */
  readonly stepIndex = signal(0);

  readonly hasSession = computed(() => this.session() !== null);

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
