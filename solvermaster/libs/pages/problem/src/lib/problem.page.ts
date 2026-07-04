import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SessionStore, SocketService } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-problem-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, StepTitleComponent],
  template: `
    <div class="max-w-[820px] mx-auto">
      <sm-step-title eyebrow="Krok 01 · Opis problemu" title="Opisz problem techniczny">
        Opisz krótko, na czym polega trudność. Agent wyodrębni z tego sprzeczność i dobierze odpowiednie metody rozwiązywania.
      </sm-step-title>

      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/10 transition">
        <div class="flex items-center justify-between px-4 pt-3.5">
          <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Opis problemu</span>
          <span class="font-mono text-[11px] text-slate-400">wolny tekst</span>
        </div>
        <textarea rows="4" [(ngModel)]="statement"
          class="w-full resize-none bg-transparent px-4 py-3 text-[16px] leading-relaxed outline-none placeholder:text-slate-400"
          placeholder="Opisz sprzeczność techniczną…"></textarea>
        <div class="flex items-center justify-between px-4 py-2.5 border-t border-line/70">
          <span class="font-mono text-[11px] text-slate-400">{{ statement.length }} znaków</span>
          <span class="font-mono text-[11px] text-slate-400">agent bez narzędzi zewnętrznych</span>
        </div>
      </div>
      <p class="text-[13px] text-slate-500 mt-3">Jedyne pole wolnego tekstu w całym przebiegu — w kolejnych krokach pracujesz na danych ustrukturyzowanych.</p>

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <span class="hidden sm:inline font-mono text-[11px] text-slate-400">⌘ + ⏎ aby uruchomić</span>
        <button type="button" (click)="submit()" [disabled]="!statement.trim() || store.busy()"
          class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">
          Dalej: wybór metod <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  `,
})
export class ProblemPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly socket = inject(SocketService);
  statement = '';

  ngOnInit() { this.store.setStep(0); }

  /**
   * First (and only) manual step: hand the problem to the agent over the socket.
   * The agent then drives every subsequent screen via `ui:show` directives —
   * we do not wait for it to finish here.
   */
  submit() {
    const statement = this.statement.trim();
    if (!statement) return;
    this.socket.startSolve({ statement });
  }
}
