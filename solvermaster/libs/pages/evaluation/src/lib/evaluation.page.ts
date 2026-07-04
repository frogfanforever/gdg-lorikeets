import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CRITERIA, SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-evaluation-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 04 · Rubryka ocen" title="Ocena kandydatów">
      Każdy koncept oceniony wg tych samych czterech kryteriów, w skali 1–5. Intensywność koloru komórki odpowiada wysokości oceny.
    </sm-step-title>

    <div class="flex items-start gap-3 rounded-lg border border-line bg-slate-50 px-4 py-3 text-[13px] text-slate-600 mb-7">
      <span class="font-mono shrink-0 mt-px text-slate-400">✱</span>
      <p>Każda ocena to osobne wywołanie modelu, <b class="font-semibold text-ink">na ślepo</b> — bez informacji o pochodzeniu konceptu, w losowej kolejności (eliminacja stronniczości metody).</p>
    </div>

    <div class="bg-surface border border-line rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)]">
      <table class="w-full text-[14px]">
        <thead>
          <tr class="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
            <th class="px-4 py-3">Kandydat</th>
            @for (c of criteria; track c.key) { <th class="px-4 py-3 text-center w-32">{{ c.label }}</th> }
          </tr>
        </thead>
        <tbody>
          @for (cand of store.candidates(); track cand.name) {
            <tr class="border-t border-line">
              <td class="px-4 py-3.5 font-medium">{{ cand.name }} <span class="font-mono text-[10px] text-slate-400 ml-1">{{ cand.tag }}</span></td>
              @for (c of criteria; track c.key) {
                <td class="px-4 py-3.5 text-center font-mono tnum font-semibold" [style.background]="cellBg(cand.scores[c.key])">{{ cand.scores[c.key] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
      <div class="flex items-center justify-end gap-2 px-4 py-2.5 border-t border-line font-mono text-[11px] text-slate-400">
        <span>skala</span>
        <span class="w-4 h-3 rounded-sm" style="background:rgba(47,92,255,0.064)"></span>
        <span class="w-4 h-3 rounded-sm" style="background:rgba(47,92,255,0.096)"></span>
        <span class="w-4 h-3 rounded-sm" style="background:rgba(47,92,255,0.128)"></span>
        <span class="w-4 h-3 rounded-sm" style="background:rgba(47,92,255,0.16)"></span>
        <span>1 → 5</span>
      </div>
    </div>

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/generation" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Generowanie</a>
      <a routerLink="/choice" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Dalej: Wybór <span aria-hidden="true">→</span></a>
    </div>
  `,
})
export class EvaluationPage implements OnInit {
  readonly store = inject(SessionStore);
  readonly criteria = CRITERIA;
  ngOnInit() { this.store.setStep(3); }
  cellBg(score: number) { return `rgba(47,92,255,${(score * 0.032).toFixed(3)})`; }
}
