import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SkeletonLoaderComponent } from '@solvermaster/ui';
import { switchMap } from 'rxjs';
import { ApiService, Principle, SessionState } from './api.service';

// ROUGH prototype of the 5-step expert TRIZ flow — wired to solver-api, unstyled.
// Proper UI + design system comes later.
@Component({
  selector: 'app-root',
  imports: [FormsModule, DecimalPipe, SkeletonLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  private readonly api = inject(ApiService);

  title = '';
  statement = 'Bicycle frame must be lighter but thinner walls lose strength under load.';
  impId = 0;
  preId = 0;

  readonly session = signal<SessionState | null>(null);
  readonly principle = signal<Principle | null>(null);
  readonly selected = signal<number[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');

  private done = (s: SessionState) => {
    this.session.set(s);
    if (s.parameters) { this.impId = s.parameters.improving.id; this.preId = s.parameters.preserving.id; }
    this.busy.set(false);
  };
  private fail = (e: any) => { this.error.set(e?.error?.error || e?.message || 'request failed'); this.busy.set(false); };
  private start() { this.busy.set(true); this.error.set(''); }

  // Step 1 → 2: create the session, then run analysis.
  analyze() {
    this.start(); this.principle.set(null); this.selected.set([]);
    this.api.createSession({ title: this.title, statement: this.statement })
      .pipe(switchMap((s) => this.api.analyze(s.session_id)))
      .subscribe({ next: this.done, error: this.fail });
  }

  // Step 2 → 3: apply (possibly overridden) parameters, then look up the matrix.
  checkMatrix() {
    const s = this.session(); if (!s) return;
    this.start(); this.principle.set(null);
    this.api.setParameters(s.session_id, Number(this.impId), Number(this.preId))
      .pipe(switchMap(() => this.api.matrix(s.session_id)))
      .subscribe({ next: this.done, error: this.fail });
  }

  // Step 4: full principle text.
  viewPrinciple(id: number) {
    this.start();
    this.api.getPrinciple(id).subscribe({ next: (p) => { this.principle.set(p); this.busy.set(false); }, error: this.fail });
  }

  toggle(id: number) {
    const cur = this.selected();
    this.selected.set(cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]);
  }

  // Step 5: synthesize the recommendation from the selected principles.
  gather() {
    const s = this.session(); if (!s || !this.selected().length) return;
    this.start();
    this.api.recommend(s.session_id, this.selected()).subscribe({ next: this.done, error: this.fail });
  }

  reset() { this.session.set(null); this.principle.set(null); this.selected.set([]); this.error.set(''); }
}
