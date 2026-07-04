import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Principle, SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

const EX_TRIZ: Principle[] = [
  { id: 40, name: 'Materiały kompozytowe', description: 'Rura z włókna węglowego w newralgicznych punktach ramy.' },
  { id: 1, name: 'Segmentacja', description: 'Segmentowa rama z mufami zamiast monokoku.' },
];
const SCAMPER = [
  { k: 'S', name: 'Substitute', desc: 'Łącznik stalowy zamieniony na tytanowy.' },
  { k: 'C', name: 'Combine', desc: 'Rama pełni jednocześnie funkcję elementu amortyzującego.' },
];

@Component({
  selector: 'sm-generation-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 03 · Generowanie konceptów" title="Dwie ścieżki generowania konceptów">
      Deterministyczny odczyt macierzy TRIZ obok heurystyki SCAMPER. Każdy koncept zachowuje jawne pochodzenie — dopisz też własny pomysł.
    </sm-step-title>

    <div class="grid md:grid-cols-2 gap-5 mb-6">
      <!-- Path A: TRIZ -->
      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <span class="text-[14px] font-semibold">Ścieżka A</span>
          <span class="font-mono text-[11px] px-2 py-1 rounded bg-accent-soft text-accent-ink">Macierz TRIZ</span>
        </div>
        <div class="px-5 py-4 flex flex-col gap-4 grow">
          @for (p of trizPrinciples(); track p.id) {
            <div class="flex gap-3">
              <span class="font-mono text-[11px] px-1.5 py-0.5 h-min rounded bg-slate-100 text-slate-600 shrink-0">{{ pad(p.id) }}</span>
              <div><div class="text-[14px] font-semibold">{{ p.name }}</div>@if (p.description) {<div class="text-[13px] text-slate-500 leading-relaxed mt-0.5">{{ p.description }}</div>}</div>
            </div>
          }
        </div>
        <div class="px-5 py-3 border-t border-line font-mono text-[11px] text-slate-400">Zasady z komórki macierzy dla wybranej sprzeczności.</div>
      </div>
      <!-- Path B: SCAMPER -->
      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] flex flex-col overflow-hidden">
        <div class="flex items-center justify-between px-5 py-3.5 border-b border-line">
          <span class="text-[14px] font-semibold">Ścieżka B</span>
          <span class="font-mono text-[11px] px-2 py-1 rounded bg-accent-soft text-accent-ink">SCAMPER</span>
        </div>
        <div class="px-5 py-4 flex flex-col gap-4 grow">
          @for (l of scamper; track l.k) {
            <div class="flex gap-3">
              <span class="font-mono text-[11px] px-1.5 py-0.5 h-min rounded bg-slate-100 text-slate-600 shrink-0">{{ l.k }}</span>
              <div><div class="text-[14px] font-semibold">{{ l.name }}</div><div class="text-[13px] text-slate-500 leading-relaxed mt-0.5">{{ l.desc }}</div></div>
            </div>
          }
        </div>
        <div class="px-5 py-3 border-t border-line font-mono text-[11px] text-slate-400">Adapt / Modify / Eliminate / Reverse — dostępne, nierozwinięte.</div>
      </div>
    </div>

    <div class="flex items-center gap-3 mb-3">
      <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Twój koncept</span>
      <span class="h-px flex-1 bg-line"></span>
    </div>
    <div class="flex flex-col sm:flex-row gap-3 mb-8">
      <input type="text" [(ngModel)]="ownConcept" placeholder="Dopisz własny koncept…"
        class="grow bg-surface border border-line rounded-lg px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
      <button (click)="addOwn()" [disabled]="!ownConcept.trim()"
        class="shrink-0 inline-flex items-center justify-center gap-2 border border-line bg-white hover:bg-slate-50 disabled:opacity-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-700 transition"><span aria-hidden="true">+</span> Dodaj do puli</button>
    </div>

    <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5">
      <div class="flex items-center gap-2 mb-3.5">
        <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Pula do oceny</span>
        <span class="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-accent text-white">{{ pool().length }}</span>
      </div>
      <div class="flex flex-wrap gap-2">
        @for (c of pool(); track c.label) {
          <span class="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 text-[13px]"
            [class]="c.tag === 'TY' ? 'border border-accent/40 bg-accent-soft text-accent-ink' : 'border border-line bg-white'">
            <span class="font-mono text-[10px]" [class]="c.tag === 'TY' ? '' : 'text-slate-400'">{{ c.tag }}</span> {{ c.label }}
          </span>
        }
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/mapping" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Mapowanie</a>
      <button (click)="next()" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Dalej: Ocena <span aria-hidden="true">→</span></button>
    </div>
  `,
})
export class GenerationPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  readonly scamper = SCAMPER;
  ownConcept = '';
  private readonly own = signal<string[]>([]);

  readonly trizPrinciples = computed<Principle[]>(() => {
    const p = this.store.session()?.matrix?.principles ?? [];
    return p.length ? p : EX_TRIZ;
  });

  readonly pool = computed(() => [
    ...this.trizPrinciples().slice(0, 3).map((p) => ({ tag: 'TRIZ', label: p.name })),
    { tag: 'SCMP', label: 'Combine' },
    ...this.own().map((o) => ({ tag: 'TY', label: o })),
  ]);

  pad(n: number) { return n.toString().padStart(2, '0'); }
  ngOnInit() { this.store.setStep(2); }
  addOwn() { const v = this.ownConcept.trim(); if (v) { this.own.update((a) => [...a, v]); this.ownConcept = ''; } }

  next() {
    const ids = this.trizPrinciples().map((p) => p.id).filter((id) => id < 1000);
    if (this.store.hasSession() && ids.length) {
      this.store.recommend(ids).subscribe({ next: () => this.router.navigate(['/evaluation']) });
    } else {
      this.router.navigate(['/evaluation']);
    }
  }
}
