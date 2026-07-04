import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CRITERIA, SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-result-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, StepTitleComponent],
  styles: [`input[type=range]{accent-color:#2f5cff;width:100%}`],
  template: `
    <sm-step-title eyebrow="Krok 05 · Ocena i wybór" title="Ocena i wybór końcowy">
      Rubryka ocen i ważony ranking na jednym ekranie. Oceny powstają na ślepo; zmiana wag przelicza ranking natychmiast, lokalnie.
    </sm-step-title>

    <div class="flex items-start gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3 text-[13px] text-slate-600 mb-4">
      <span class="font-mono shrink-0 mt-px text-slate-400">✱</span>
      <p>Każda ocena to osobne wywołanie modelu, <b class="font-semibold text-ink">na ślepo</b> — bez informacji o pochodzeniu konceptu, w losowej kolejności (eliminacja stronniczości metody).</p>
    </div>

    <!-- Rubric -->
    <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Rubryka ocen — kandydaci × kryteria (1–5)</span><span class="h-px flex-1 bg-line"></span></div>
    <div class="bg-surface border border-line rounded-xl overflow-x-auto shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] mb-9">
      <table class="w-full text-[14px] min-w-[560px]">
        <thead>
          <tr class="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            <th class="px-4 py-3">Kandydat</th>
            @for (c of criteria; track c.key) { <th class="px-4 py-3 text-center w-32">{{ labels[c.key] }}</th> }
          </tr>
        </thead>
        <tbody>
          @for (cand of candidates(); track cand.name) {
            <tr class="border-t border-line">
              <td class="px-4 py-3.5 font-medium">{{ cand.name }} <span class="font-mono text-[10px] text-slate-400 ml-1">{{ cand.tag }}</span></td>
              @for (c of criteria; track c.key) {
                <td class="px-4 py-3.5 text-center font-mono tnum font-semibold" [style.background]="cellBg(cand.scores[c.key])">{{ cand.scores[c.key] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>

    <!-- Choice -->
    <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Wybór — ważona suma ocen</span><span class="h-px flex-1 bg-line"></span></div>
    <div class="grid lg:grid-cols-[380px_1fr] gap-5 items-start">
      <!-- Weights -->
      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5">
        <div class="flex items-center gap-3 mb-5"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Wagi kryteriów</span><span class="h-px flex-1 bg-line"></span></div>
        @for (c of criteria; track c.key; let i = $index) {
          <div [class]="i < criteria.length - 1 ? 'mb-5' : ''">
            <div class="flex justify-between items-baseline text-[14px] mb-2">
              <span>{{ weightLabels[c.key] }}</span>
              <span class="font-mono tnum text-accent-ink font-semibold">{{ pct()[c.key] | number:'1.0-0' }}%</span>
            </div>
            <input type="range" min="0" max="100" [value]="weights()[c.key]" (input)="setWeight(c.key, $any($event.target).value)">
          </div>
        }
      </div>

      <div class="flex flex-col gap-5">
        <!-- Ranking -->
        <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5">
          <div class="flex items-center gap-3 mb-5"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Ranking na żywo</span><span class="h-px flex-1 bg-line"></span></div>
          @for (r of ranking(); track r.name; let first = $first) {
            <div class="flex items-center gap-3 mb-3 last:mb-0">
              <div class="w-[188px] shrink-0 flex items-center gap-2 min-w-0">
                <span class="font-mono text-[10px] w-9 shrink-0" [class]="first ? 'text-accent-ink' : 'text-slate-400'">{{ r.tag }}</span>
                <span class="text-[13px] truncate" [class]="first ? 'font-semibold' : ''">{{ r.name }}</span>
              </div>
              <div class="flex-1 h-2.5 rounded-full bg-slate-100 overflow-hidden">
                <div class="h-full rounded-full transition-all duration-200" [style.width.%]="r.val / max() * 100" [style.background]="first ? '#2f5cff' : '#c3cad6'"></div>
              </div>
              <span class="font-mono tnum text-[13px] w-10 text-right shrink-0" [class]="first ? 'font-semibold text-accent-ink' : 'text-slate-500'">{{ r.val | number:'1.2-2' }}</span>
              <span class="w-16 shrink-0 text-right">
                @if (first) { <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent text-white">lider</span> }
              </span>
            </div>
          }
          <p class="text-[13px] text-slate-500 mt-3 pt-3 border-t border-line">{{ sensitivity() }}</p>
        </div>

        <!-- Rationale -->
        <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5">
          <div class="flex items-center gap-3 mb-3.5"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Uzasadnienie</span><span class="h-px flex-1 bg-line"></span></div>
          <p class="text-[14px] leading-relaxed text-slate-700">Przy bieżących wagach liderem jest <b class="font-semibold text-ink">{{ ranking()[0]?.name }}</b> — ranking to ważona suma ocen ze wszystkich czterech kryteriów.</p>
          <a routerLink="/analysis" class="inline-flex items-center gap-2 mt-4 border border-line bg-white hover:bg-slate-50 rounded-full pl-3 pr-3.5 py-1.5 text-[13px] text-slate-600 transition"><span aria-hidden="true">✎</span> popraw analizę</a>
        </div>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/shortlist" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Shortlist</a>
      <button class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Zaakceptuj wybór <span aria-hidden="true">✓</span></button>
    </div>
  `,
})
export class ResultPage implements OnInit {
  readonly store = inject(SessionStore);
  readonly criteria = CRITERIA;
  readonly candidates = this.store.candidates;
  readonly labels: Record<string, string> = {
    e: 'Eliminacja', i: 'Idealność', z: 'Zasoby', w: 'Wykonalność',
  };
  readonly weightLabels: Record<string, string> = {
    e: 'Eliminacja sprzeczności', i: 'Przyrost idealności', z: 'Zasoby systemu', w: 'Wykonalność',
  };

  readonly weights = signal<Record<string, number>>({ e: 50, i: 50, z: 50, w: 50 });

  readonly pct = computed(() => {
    const w = this.weights();
    const sum = CRITERIA.reduce((a, c) => a + w[c.key], 0) || 1;
    return Object.fromEntries(CRITERIA.map((c) => [c.key, (w[c.key] / sum) * 100]));
  });

  readonly ranking = computed(() => {
    const w = this.weights();
    const sum = CRITERIA.reduce((a, c) => a + w[c.key], 0) || 1;
    const norm = Object.fromEntries(CRITERIA.map((c) => [c.key, w[c.key] / sum]));
    return this.candidates()
      .map((c) => ({ name: c.name, tag: c.tag, val: CRITERIA.reduce((acc, k) => acc + c.scores[k.key] * norm[k.key], 0) }))
      .sort((a, b) => b.val - a.val);
  });

  readonly max = computed(() => this.ranking()[0]?.val || 1);

  readonly sensitivity = computed(() => {
    const r = this.ranking();
    if (r.length < 2) return '';
    const m = r[0].val - r[1].val;
    if (m > 0.5) return `Wysoka pewność wyboru — przewaga nad 2. miejscem: ${m.toFixed(2)} pkt.`;
    if (m > 0.15) return `Umiarkowana pewność — przewaga nad 2. miejscem: ${m.toFixed(2)} pkt.`;
    return `Wynik niepewny (przewaga ${m.toFixed(2)} pkt) — sprawdź uzasadnienie przed akceptacją.`;
  });

  /** Heatmap cell tint — alpha scales with the 1–5 score (matches the design). */
  cellBg(score: number) { return `rgba(47,92,255,${(score * 0.032).toFixed(3)})`; }

  ngOnInit() { this.store.setStep(4); }
  setWeight(key: string, value: string) {
    this.weights.update((w) => ({ ...w, [key]: parseFloat(value) }));
  }
}
