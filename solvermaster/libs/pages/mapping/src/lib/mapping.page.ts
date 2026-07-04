import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-mapping-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[820px] mx-auto">
      <sm-step-title eyebrow="Krok 02 · Mapowanie parametrów" title="Mapowanie">Top-5 dopasowań parametrów TRIZ z możliwością korekty ręcznej.</sm-step-title>
      <div class="dotgrid bg-surface border border-line rounded-xl px-6 py-14 text-center shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
        <div class="font-mono text-[11px] uppercase tracking-[0.16em] text-accent mb-2">w przygotowaniu</div>
        <p class="text-[14px] text-slate-500 max-w-[46ch] mx-auto">Ten ekran (zgodny z designem) powstaje w kolejnej fazie. Architektura, routing, stepper i loader już działają.</p>
      </div>
      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/contradiction" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Wstecz</a>
        <a routerLink="/generation" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Dalej <span aria-hidden="true">→</span></a>
      </div>
    </div>
  `,
})
export class MappingPage implements OnInit {
  private readonly store = inject(SessionStore);
  ngOnInit() { this.store.setStep(1); }
}
