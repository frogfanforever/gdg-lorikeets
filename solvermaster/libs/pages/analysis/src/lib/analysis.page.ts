import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { Param, SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-analysis-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 03 · Analiza i generowanie" title="Jak TRIZ rozwiązał problem">
      Agent wyodrębnił sprzeczność, zmapował ją na parametry TRIZ i odczytał zasady wynalazcze z macierzy. Możesz zmienić dopasowanie parametrów — koncepty przeliczą się z macierzy.
    </sm-step-title>

    @if (!analysis()) {
      <div class="bg-surface border border-line rounded-xl p-6 text-[14px] text-slate-500">
        Brak wyniku analizy. Wróć do wyboru metod i uruchom analizę.
      </div>
    } @else {
      <div class="grid gap-7">
        <!-- 1 · Contradiction -->
        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">1 · Sprzeczność techniczna</span><span class="h-px flex-1 bg-line"></span></div>
          <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04)] p-5 max-w-[820px] grid gap-4">
            <div>
              <div class="flex items-center gap-2 mb-1.5"><span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP1 · parametr poprawiany</span><span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">poprawiany</span></div>
              <div class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px]">
                <span class="font-mono text-[12px] text-slate-400 mr-2">{{ chosen()?.improving?.id }}</span>{{ chosen()?.improving?.name || '—' }}
              </div>
            </div>
            <div>
              <div class="flex items-center gap-2 mb-1.5"><span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP2 · parametr pogarszany</span><span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-line">pogarszany</span></div>
              <div class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px]">
                <span class="font-mono text-[12px] text-slate-400 mr-2">{{ chosen()?.preserving?.id }}</span>{{ chosen()?.preserving?.name || '—' }}
              </div>
            </div>
          </div>
        </div>

        <!-- 2 · Parameter mapping -->
        <div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">2 · Mapowanie na parametry — poprawiany (EP1)</span><span class="h-px flex-1 bg-line"></span></div>
          <ng-container [ngTemplateOutlet]="mapTable" [ngTemplateOutletContext]="{ rows: improvingOptions(), chosen: chosen()?.improving?.id, side: 'improving' }"></ng-container>
          <div class="mt-4"></div>
          <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">2 · Mapowanie na parametry — pogarszany (EP2)</span><span class="h-px flex-1 bg-line"></span></div>
          <ng-container [ngTemplateOutlet]="mapTable" [ngTemplateOutletContext]="{ rows: preservingOptions(), chosen: chosen()?.preserving?.id, side: 'preserving' }"></ng-container>
        </div>

        <!-- 3 · Concepts (matrix principles) -->
        <div>
          <div class="flex items-center gap-3 mb-3">
            <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">3 · Zasady wynalazcze — komórka {{ chosen()?.improving?.id }} × {{ chosen()?.preserving?.id }}</span>
            <span class="h-px flex-1 bg-line"></span>
          </div>
          @if (principles().length) {
            <div class="grid gap-3">
              @for (p of principles(); track p.id) {
                <div class="bg-surface border border-line rounded-xl p-4 flex items-start gap-3.5 shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
                  <span class="font-mono text-[12px] w-8 h-8 shrink-0 grid place-items-center rounded-md bg-slate-100 text-slate-600 font-semibold">{{ p.id }}</span>
                  <div class="flex-1 min-w-0">
                    <div class="text-[14px] font-semibold">{{ p.name }}</div>
                    @if (p.description) { <div class="text-[13px] text-slate-500 leading-relaxed mt-0.5">{{ p.description }}</div> }
                  </div>
                </div>
              }
            </div>
          } @else {
            <div class="bg-surface border border-line rounded-xl p-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <p class="text-[13px] text-slate-500 flex-1">Odczytaj zasady wynalazcze z komórki macierzy dla wybranych parametrów.</p>
              <button type="button" (click)="runMatrix()" [disabled]="store.busy() || store.automode()"
                class="shrink-0 inline-flex items-center justify-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-4 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">Wygeneruj koncepty <span aria-hidden="true">→</span></button>
            </div>
          }
        </div>
      </div>
    }

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/methods" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Wybór metod</a>
      <button type="button" (click)="next()" [disabled]="!principles().length || store.automode()"
        class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">Dalej: Shortlist <span aria-hidden="true">→</span></button>
    </div>

    <!-- template -->
    <ng-template #mapTable let-rows="rows" let-chosen="chosen" let-side="side">
      @if (rows.length) {
        <div class="bg-surface border border-line rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
          <table class="w-full text-[14px]">
            <thead><tr class="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500"><th class="px-4 py-2.5 w-14">#</th><th class="px-4 py-2.5">Parametr</th><th class="px-4 py-2.5 w-52">Pewność</th><th class="px-4 py-2.5 w-40">Status</th></tr></thead>
            <tbody>
              @for (r of rows; track r.id) {
                <tr class="border-t border-line cursor-pointer transition" [class]="r.id === chosen ? 'bg-accent-soft/70' : 'hover:bg-slate-50'" (click)="choose(side, r.id)">
                  <td class="px-4 py-2.5 font-mono" [class]="r.id === chosen ? 'font-semibold border-l-2 border-accent' : ''">{{ r.id }}</td>
                  <td class="px-4 py-2.5" [class]="r.id === chosen ? 'font-semibold' : ''">{{ r.name }}</td>
                  <td class="px-4 py-2.5">
                    @if (r.confidence != null) {
                      <div class="flex items-center gap-2.5">
                        <div class="h-1.5 flex-1 rounded-full" [class]="r.id === chosen ? 'bg-white/70' : 'bg-slate-100'">
                          <div class="h-full rounded-full" [style.width.%]="r.confidence * 100" [class]="r.id === chosen ? 'bg-accent' : 'bg-slate-400'"></div>
                        </div>
                        <span class="font-mono tnum text-[12px] w-9 text-right" [class]="r.id === chosen ? 'font-semibold text-accent-ink' : ''">{{ r.confidence | number:'1.2-2' }}</span>
                      </div>
                    } @else { <span class="text-slate-400 font-mono text-[11px]">—</span> }
                  </td>
                  <td class="px-4 py-2.5">
                    @if (r.id === chosen) {
                      <span class="inline-flex items-center gap-1.5 font-mono text-[11px] px-2 py-1 rounded bg-accent text-white">wybrano</span>
                    } @else {
                      <span class="text-slate-400 font-mono text-[11px]">alternatywa</span>
                    }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="bg-surface border border-line rounded-xl p-4 text-[13px] text-slate-400">Brak alternatyw — agent nie zaproponował innych parametrów.</div>
      }
    </ng-template>
  `,
})
export class AnalysisPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  readonly analysis = this.store.analysis;
  readonly chosen = this.store.parameters;
  readonly principles = this.store.principles;

  readonly improvingOptions = computed<Param[]>(() => this.store.paramOptions('improving'));
  readonly preservingOptions = computed<Param[]>(() => this.store.paramOptions('preserving'));

  ngOnInit() {
    if (!this.store.hasSession()) { this.router.navigate(['/problem']); return; }
    this.store.setStep(2);
  }

  choose(side: 'improving' | 'preserving', id: number) {
    const p = this.chosen();
    const improving = side === 'improving' ? id : p?.improving?.id;
    const preserving = side === 'preserving' ? id : p?.preserving?.id;
    if (!improving || !preserving || id === (side === 'improving' ? p?.improving?.id : p?.preserving?.id)) return;
    this.store.setParameters(improving, preserving).subscribe();
  }

  runMatrix() {
    this.store.matrix().subscribe({ next: () => this.store.selectAllPrinciples() });
  }

  next() {
    if (this.principles().length) this.router.navigate(['/shortlist']);
  }
}
