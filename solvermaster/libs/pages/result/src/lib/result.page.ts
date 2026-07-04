import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore, principleName } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-result-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 05 · Rekomendacja" title="Rekomendacja rozwiązania">
      Agent rozwinął wybrane zasady wynalazcze w spójną rekomendację dla Twojej sprzeczności.
    </sm-step-title>

    @if (!recommendation()) {
      <div class="bg-surface border border-line rounded-xl p-6 text-[14px] text-slate-500">
        @if (store.busy()) { Generowanie rekomendacji… }
        @else { Brak rekomendacji. <button type="button" (click)="generate()" class="text-accent-ink font-medium underline">Wygeneruj</button> na podstawie wybranych zasad. }
      </div>
    } @else {
      <!-- Applied principles -->
      <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Zastosowane zasady</span><span class="h-px flex-1 bg-line"></span></div>
      <div class="flex flex-wrap gap-2 mb-9">
        @for (p of appliedPrinciples(); track p.id) {
          <span class="inline-flex items-center gap-1.5 border border-line bg-white rounded-full pl-2 pr-3 py-1.5 text-[13px]"><span class="font-mono text-[10px] text-slate-400">TRIZ {{ p.id }}</span>{{ p.name }}</span>
        }
      </div>

      <!-- Recommendation -->
      <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Rekomendacja</span><span class="h-px flex-1 bg-line"></span></div>
      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-6 mb-9">
        <p class="text-[15px] leading-relaxed text-slate-700 whitespace-pre-line">{{ recommendation()?.text }}</p>
      </div>

      <!-- Decision trace -->
      @if (trace().length) {
        <div class="flex items-center gap-3 mb-3"><span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">Ślad decyzyjny</span><span class="h-px flex-1 bg-line"></span></div>
        <div class="bg-slate-50 border border-line rounded-xl p-5">
          <ol class="grid gap-2">
            @for (t of trace(); track t; let i = $index) {
              <li class="flex items-start gap-3 text-[13px] text-slate-600">
                <span class="font-mono text-[10px] w-5 h-5 shrink-0 grid place-items-center rounded bg-white border border-line text-slate-400">{{ i + 1 }}</span>
                <span class="leading-relaxed">{{ t }}</span>
              </li>
            }
          </ol>
        </div>
      }
    }

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/shortlist" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Shortlist</a>
      <button type="button" (click)="generate()" [disabled]="store.busy() || !store.selected().size || store.automode()"
        class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">
        {{ recommendation() ? 'Przelicz ponownie' : 'Wygeneruj rekomendację' }} <span aria-hidden="true">↻</span>
      </button>
    </div>
  `,
})
export class ResultPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  readonly recommendation = this.store.recommendation;
  readonly trace = this.store.decisionTrace;

  readonly appliedPrinciples = computed(() => {
    const ids = this.recommendation()?.applied_principle_ids ?? [];
    const byId = new Map(this.store.principles().map((p) => [p.id, p]));
    return ids.map((id) => {
      const found = byId.get(id);
      return { id, name: principleName(id, found?.name), description: found?.description };
    });
  });

  ngOnInit() {
    if (!this.store.hasSession()) { this.router.navigate(['/problem']); return; }
    this.store.setStep(4);
    if (!this.recommendation() && this.store.selected().size) this.generate();
  }

  generate() {
    const ids = [...this.store.selected()];
    if (!ids.length) return;
    this.store.recommend(ids).subscribe();
  }
}
