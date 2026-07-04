import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-shortlist-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[900px] mx-auto">
      <sm-step-title eyebrow="Krok 04 · Shortlist" title="Wybierz zasady do rekomendacji">
        Macierz sprzeczności zwróciła poniższe zasady wynalazcze. Zaznacz te, które agent ma rozwinąć w rekomendację rozwiązania.
      </sm-step-title>

      @if (!principles().length) {
        <div class="bg-surface border border-line rounded-xl p-6 text-[14px] text-slate-500">
          @if (store.agentRunning()) {
            Agent odczytuje zasady wynalazcze z macierzy — koncepty pojawią się za chwilę.
          } @else {
            Brak zasad. Wróć do analizy i wygeneruj koncepty z macierzy.
          }
        </div>
      } @else {
        <div class="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent-ink mb-7">
          <span class="font-mono shrink-0 mt-px">⋔</span>
          <p><b class="font-semibold">{{ selectedCount() }} z {{ principles().length }}</b> zasad wybranych do rekomendacji.</p>
        </div>

        <div class="grid gap-3">
          @for (p of principles(); track p.id; let i = $index) {
            <label class="bg-surface border rounded-xl p-5 shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] flex items-start gap-4 cursor-pointer transition"
              [class]="isSelected(p.id) ? 'border-accent' : 'border-line'">
              <input type="checkbox" class="peer sr-only" [checked]="isSelected(p.id)" (change)="store.toggleSelected(p.id)">
              <span class="font-mono text-[13px] w-8 h-8 shrink-0 grid place-items-center rounded-md font-semibold"
                [class]="isSelected(p.id) ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500'">{{ p.id }}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <span class="text-[15px] font-semibold">{{ p.name }}</span>
                  <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">TRIZ {{ p.id }}</span>
                </div>
                @if (p.description) { <p class="text-[13px] text-slate-500 leading-relaxed">{{ p.description }}</p> }
              </div>
              <span class="shrink-0 w-6 h-6 rounded-md grid place-items-center font-mono text-[13px] transition"
                [class]="isSelected(p.id) ? 'bg-accent text-white' : 'bg-slate-100 text-slate-300'">✓</span>
            </label>
          }
        </div>
      }

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/analysis" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Analiza</a>
        <button type="button" (click)="next()" [disabled]="!selectedCount() || store.automode()"
          class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">Przejdź do wyniku <span aria-hidden="true">→</span></button>
      </div>
    </div>
  `,
})
export class ShortlistPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  readonly principles = this.store.principles;
  readonly selectedCount = computed(() => this.store.selected().size);

  ngOnInit() {
    if (!this.store.hasSession()) { this.router.navigate(['/problem']); return; }
    this.store.setStep(3);
    if (this.principles().length && !this.store.selected().size) this.store.selectAllPrinciples();
  }

  isSelected(id: number) { return this.store.selected().has(id); }

  next() {
    if (this.store.selected().size) this.router.navigate(['/result']);
  }
}
