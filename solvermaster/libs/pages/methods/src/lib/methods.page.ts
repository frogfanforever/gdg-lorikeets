import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

interface Method {
  key: 'triz' | 'scamper';
  name: string;
  badge: string;
  description: string;
  requires: string[];
}

const METHODS: Method[] = [
  {
    key: 'triz',
    name: 'TRIZ',
    badge: 'macierz sprzeczności',
    description: 'Deterministyczny odczyt 40 zasad wynalazczych z macierzy sprzeczności 39×39. Powtarzalny i wyjaśnialny.',
    requires: ['sprzeczność', 'mapowanie'],
  },
  {
    key: 'scamper',
    name: 'SCAMPER',
    badge: 'heurystyka',
    description: 'Siedem przekształceń: Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Reverse. Rozbieżna eksploracja.',
    requires: [],
  },
];

@Component({
  selector: 'sm-methods-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[880px] mx-auto">
      <sm-step-title eyebrow="Krok 02 · Wybór metod" title="Wybierz metody generowania">
        Zaznacz metody, których agent użyje. TRIZ dodatkowo wymaga sprzeczności i mapowania — SCAMPER działa bezpośrednio na opisie.
      </sm-step-title>

      <div class="grid md:grid-cols-2 gap-4">
        @for (m of methods; track m.key) {
          <label
            class="group relative block cursor-pointer bg-surface rounded-xl p-5 transition"
            [class]="selected().has(m.key)
              ? 'border-2 border-accent shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(47,92,255,0.4)]'
              : 'border-2 border-line shadow-[0_1px_2px_rgba(12,14,20,0.04)]'">
            <input type="checkbox" [checked]="selected().has(m.key)" (change)="toggle(m.key)" class="peer sr-only">
            <span class="absolute top-4 right-4 w-6 h-6 rounded-md grid place-items-center font-mono text-[13px] transition"
              [class]="selected().has(m.key) ? 'bg-accent text-white' : 'bg-slate-100 text-slate-300'">✓</span>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[16px] font-semibold">{{ m.name }}</span>
              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">{{ m.badge }}</span>
            </div>
            <p class="text-[13px] text-slate-500 leading-relaxed mb-4">{{ m.description }}</p>
            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
              <span class="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">wymaga</span>
              @if (m.requires.length) {
                @for (r of m.requires; track r) {
                  <span class="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{{ r }}</span>
                }
              } @else {
                <span class="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500">bez dodatkowych kroków</span>
              }
            </div>
          </label>
        }
      </div>

      <div class="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent-ink mt-4">
        <span class="font-mono shrink-0 mt-px">✓</span>
        <p>Wybrano <b class="font-semibold">{{ selected().size }} z {{ methods.length }}</b> metod. W kroku <b class="font-semibold">Analiza</b> przełączysz się między widokiem TRIZ a SCAMPER i zobaczysz, jak każda doszła do konceptów.</p>
      </div>

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/problem" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Opis problemu</a>
        <a routerLink="/analysis" [class.pointer-events-none]="!selected().size" [class.opacity-50]="!selected().size"
          class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Uruchom wybrane metody <span aria-hidden="true">→</span></a>
      </div>
    </div>
  `,
})
export class MethodsPage implements OnInit {
  readonly store = inject(SessionStore);
  readonly methods = METHODS;
  readonly selected = signal<Set<Method['key']>>(new Set(['triz', 'scamper']));

  ngOnInit() { this.store.setStep(1); }

  toggle(key: Method['key']) {
    this.selected.update((s) => {
      const next = new Set(s);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }
}
