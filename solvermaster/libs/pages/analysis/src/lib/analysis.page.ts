import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

interface ParamRow { id: string; name: string; match: number; status: 'rejected' | 'selected' | 'auto' | 'none' }
interface Concept { code: string; name: string; description: string }

const IMPROVING: ParamRow[] = [
  { id: '02', name: 'Waga nieruchomego obiektu', match: 0.85, status: 'rejected' },
  { id: '01', name: 'Waga ruchomego obiektu', match: 0.81, status: 'selected' },
  { id: '05', name: 'Powierzchnia ruchomego obiektu', match: 0.44, status: 'none' },
];
const PRESERVING: ParamRow[] = [
  { id: '14', name: 'Wytrzymałość', match: 0.92, status: 'auto' },
  { id: '11', name: 'Naprężenie', match: 0.71, status: 'none' },
];
const TRIZ_CONCEPTS: Concept[] = [
  { code: '40', name: 'Materiały kompozytowe', description: 'Rura z włókna węglowego w newralgicznych punktach ramy.' },
  { code: '01', name: 'Segmentacja', description: 'Segmentowa rama z mufami zamiast monokoku.' },
];
const SCAMPER_CONCEPTS: Concept[] = [
  { code: 'S', name: 'Substitute', description: 'Łącznik stalowy zamieniony na tytanowy.' },
  { code: 'C', name: 'Combine', description: 'Rama pełni jednocześnie funkcję elementu amortyzującego.' },
];
const SCAMPER_REST = ['Adapt', 'Modify', 'Put to other use', 'Eliminate', 'Reverse'];

@Component({
  selector: 'sm-analysis-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 03 · Analiza i generowanie" title="Jak metody rozwiązały problem">
      Przełączaj widok między ścieżkami, żeby zobaczyć jak każda metoda doszła do konceptów. Kandydaci z obu trafiają do jednej, wspólnej puli poniżej.
    </sm-step-title>

    <div class="flex flex-wrap items-center gap-3 mb-6">
      <div class="inline-flex p-1 bg-white border border-line rounded-lg" role="tablist">
        <button (click)="tab.set('triz')"
          [class]="tab() === 'triz' ? activeTab : idleTab">TRIZ <span class="font-mono text-[11px] px-1.5 rounded-full" [class]="tab() === 'triz' ? 'bg-black/15' : 'bg-black/10'">2</span></button>
        <button (click)="tab.set('scamper')"
          [class]="tab() === 'scamper' ? activeTab : idleTab">SCAMPER <span class="font-mono text-[11px] px-1.5 rounded-full" [class]="tab() === 'scamper' ? 'bg-black/15' : 'bg-black/10'">2</span></button>
      </div>
      <div class="ml-auto flex items-center gap-4 font-mono text-[11px] text-slate-500">
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-accent"></span>TRIZ gotowe</span>
        <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-accent"></span>SCAMPER gotowe</span>
      </div>
    </div>

    <!-- TRIZ -->
    @if (tab() === 'triz') {
      <div class="grid gap-7">
        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">1 · Sprzeczność techniczna</span><span class="h-px flex-1 bg-line"></span></div>
          <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04)] p-5 max-w-[820px]">
            <div class="mb-3">
              <div class="flex items-center gap-2 mb-1.5"><span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">AP · akcja</span></div>
              <input type="text" value="Zmniejszyć grubość ścianki rury" class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
            </div>
            <div class="mb-3">
              <div class="flex items-center gap-2 mb-1.5"><span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP1 · efekt pozytywny</span><span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">poprawiany</span></div>
              <input type="text" value="Mniejsza waga" class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1.5"><span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP2 · efekt negatywny</span><span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-line">pogarszany</span></div>
              <input type="text" value="Niższa wytrzymałość" class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
            </div>
          </div>
        </div>

        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">2 · Mapowanie na parametry — poprawiany (EP1)</span><span class="h-px flex-1 bg-line"></span></div>
          <ng-container [ngTemplateOutlet]="mapTable" [ngTemplateOutletContext]="{ rows: improving }"></ng-container>
          <div class="mt-4"></div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">2 · Mapowanie na parametry — zachowywany (EP2)</span><span class="h-px flex-1 bg-line"></span></div>
          <ng-container [ngTemplateOutlet]="mapTable" [ngTemplateOutletContext]="{ rows: preserving }"></ng-container>
        </div>

        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">3 · Koncepty TRIZ — komórka 01 × 14</span><span class="h-px flex-1 bg-line"></span></div>
          <div class="grid gap-3">
            @for (c of trizConcepts; track c.code) {
              <ng-container [ngTemplateOutlet]="conceptCard" [ngTemplateOutletContext]="{ c: c }"></ng-container>
            }
          </div>
          <p class="font-mono text-[11px] text-slate-400 mt-3">Zasady 10 i 26 znalezione, nierozwinięte w tym przebiegu.</p>
        </div>
      </div>
    }

    <!-- SCAMPER -->
    @if (tab() === 'scamper') {
      <div class="grid gap-7">
        <div class="flex items-start gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3 text-[13px] text-slate-600 max-w-[820px]">
          <span class="font-mono shrink-0 mt-px text-slate-400">i</span>
          <p>SCAMPER nie wymaga sprzeczności ani mapowania — działa bezpośrednio na opisie problemu przez siedem przekształceń.</p>
        </div>
        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Przekształcenia — 2 z 7 rozwinięte</span><span class="h-px flex-1 bg-line"></span></div>
          <div class="grid gap-3">
            @for (c of scamperConcepts; track c.code) {
              <ng-container [ngTemplateOutlet]="conceptCard" [ngTemplateOutletContext]="{ c: c }"></ng-container>
            }
          </div>
          <div class="flex flex-wrap gap-2 mt-3">
            @for (r of scamperRest; track r) {
              <span class="font-mono text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-400">{{ r }}</span>
            }
          </div>
        </div>
      </div>
    }

    <!-- Wspólne: koncept + pula -->
    <div class="mt-9">
      <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Twój koncept</span><span class="h-px flex-1 bg-line"></span></div>
      <div class="flex flex-col sm:flex-row gap-3">
        <input type="text" value="Rama hybrydowa — aluminium w większości struktury, kompozyt węglowy tylko w newralgicznych punktach." class="grow bg-surface border border-line rounded-lg px-3.5 py-2.5 text-[14px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
        <button class="shrink-0 inline-flex items-center justify-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-700 transition"><span aria-hidden="true">+</span> Dodaj do puli</button>
      </div>
    </div>

    <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5 mt-6">
      <div class="flex items-center gap-2 mb-3.5">
        <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Wspólna pula</span>
        <span class="font-mono text-[11px] px-1.5 py-0.5 rounded-full bg-accent text-white">5</span>
        <span class="ml-auto font-mono text-[11px] text-slate-400">scalanie i deduplikacja w kroku Shortlist</span>
      </div>
      <div class="flex flex-wrap gap-2">
        @for (p of pool; track p.name) {
          <span class="inline-flex items-center gap-1.5 rounded-full pl-2.5 pr-3 py-1.5 text-[13px]"
            [class]="p.tag === 'TY' ? 'border border-accent/40 bg-accent-soft text-accent-ink' : 'border border-line bg-white'">
            <span class="font-mono text-[10px]" [class]="p.tag === 'TY' ? '' : 'text-slate-400'">{{ p.tag }}</span> {{ p.name }}
          </span>
        }
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/methods" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Wybór metod</a>
      <a routerLink="/shortlist" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Dalej: Shortlist <span aria-hidden="true">→</span></a>
    </div>

    <!-- templates -->
    <ng-template #mapTable let-rows="rows">
      <div class="bg-surface border border-line rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
        <table class="w-full text-[14px]">
          <thead><tr class="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"><th class="px-4 py-2.5 w-14">#</th><th class="px-4 py-2.5">Parametr</th><th class="px-4 py-2.5 w-52">Dopasowanie</th><th class="px-4 py-2.5 w-40">Status</th></tr></thead>
          <tbody>
            @for (r of rows; track r.id) {
              <tr class="border-t border-line transition" [class]="r.status === 'selected' || r.status === 'auto' ? 'bg-accent-soft/70' : 'hover:bg-slate-50'">
                <td class="px-4 py-2.5 font-mono" [class]="r.status === 'rejected' ? 'line-through text-slate-400' : (r.status === 'selected' || r.status === 'auto') ? 'font-semibold border-l-2 border-accent' : ''">{{ r.id }}</td>
                <td class="px-4 py-2.5" [class]="r.status === 'rejected' ? 'line-through text-slate-400' : (r.status === 'selected' || r.status === 'auto') ? 'font-semibold' : ''">{{ r.name }}</td>
                <td class="px-4 py-2.5">
                  <div class="flex items-center gap-2.5">
                    <div class="h-1.5 flex-1 rounded-full" [class]="r.status === 'selected' || r.status === 'auto' ? 'bg-white/70' : 'bg-slate-100'">
                      <div class="h-full rounded-full" [style.width.%]="r.match * 100"
                        [class]="r.status === 'selected' || r.status === 'auto' ? 'bg-accent' : r.status === 'rejected' ? 'bg-slate-300' : 'bg-slate-400'"></div>
                    </div>
                    <span class="font-mono tnum text-[12px] w-9 text-right" [class]="r.status === 'rejected' ? 'line-through' : (r.status === 'selected' || r.status === 'auto') ? 'font-semibold text-accent-ink' : ''">{{ r.match | number:'1.2-2' }}</span>
                  </div>
                </td>
                <td class="px-4 py-2.5">
                  @switch (r.status) {
                    @case ('selected') { <span class="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded bg-accent text-white">wybrano</span> }
                    @case ('auto') { <span class="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded bg-accent text-white">auto</span> }
                    @case ('rejected') { <span class="text-slate-400 font-mono text-[11px]">odrzucono</span> }
                    @default { <span class="text-slate-400 font-mono text-[11px]">—</span> }
                  }
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </ng-template>

    <ng-template #conceptCard let-c="c">
      <div class="bg-surface border border-line rounded-xl p-4 flex items-start gap-3.5 shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
        <span class="font-mono text-[12px] w-8 h-8 shrink-0 grid place-items-center rounded-md bg-slate-100 text-slate-600 font-semibold">{{ c.code }}</span>
        <div class="flex-1 min-w-0"><div class="text-[14px] font-semibold">{{ c.name }}</div><div class="text-[13px] text-slate-500 leading-relaxed mt-0.5">{{ c.description }}</div></div>
        <span class="shrink-0 inline-flex items-center gap-1.5 font-mono text-[11px] px-2.5 py-1.5 rounded-lg bg-accent-soft text-accent-ink border border-accent/30">✓ w puli</span>
      </div>
    </ng-template>
  `,
})
export class AnalysisPage implements OnInit {
  readonly store = inject(SessionStore);
  readonly tab = signal<'triz' | 'scamper'>('triz');

  readonly improving = IMPROVING;
  readonly preserving = PRESERVING;
  readonly trizConcepts = TRIZ_CONCEPTS;
  readonly scamperConcepts = SCAMPER_CONCEPTS;
  readonly scamperRest = SCAMPER_REST;
  readonly pool: { tag: string; name: string }[] = [
    { tag: 'TRIZ', name: 'Materiały kompozytowe' },
    { tag: 'TRIZ', name: 'Segmentacja' },
    { tag: 'SCMP', name: 'Substitute' },
    { tag: 'SCMP', name: 'Combine' },
    { tag: 'TY', name: 'Koncept własny' },
  ];

  readonly activeTab = 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium bg-accent text-white transition';
  readonly idleTab = 'inline-flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-medium text-slate-600 hover:bg-slate-50 transition';

  ngOnInit() { this.store.setStep(2); }
}
