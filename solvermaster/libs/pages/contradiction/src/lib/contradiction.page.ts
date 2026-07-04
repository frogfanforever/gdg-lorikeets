import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-contradiction-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[820px] mx-auto">
      <sm-step-title eyebrow="Krok 01 · Formułowanie sprzeczności" title="Popraw sprzeczność">
        Agent rozłożył opis na trzy pola. Popraw sformułowanie tutaj — bez powrotu do wolnego tekstu.
      </sm-step-title>

      <div class="bg-surface border border-line rounded-xl shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] p-5 sm:p-6">
        <div class="flex items-center gap-3 mb-5">
          <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">Sprzeczność techniczna</span>
          <span class="h-px flex-1 bg-line"></span>
        </div>

        <div class="mb-4">
          <div class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500 mb-1.5">AP · akcja</div>
          <input type="text" [(ngModel)]="action"
            class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
        </div>

        <div class="mb-4">
          <div class="flex items-center gap-2 mb-1.5">
            <span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP1 · efekt pozytywny</span>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">poprawiany</span>
          </div>
          <input type="text" [(ngModel)]="improving"
            class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
        </div>

        <div>
          <div class="flex items-center gap-2 mb-1.5">
            <span class="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">EP2 · efekt negatywny</span>
            <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-line">pogarszany</span>
          </div>
          <input type="text" [(ngModel)]="preserving"
            class="w-full bg-white border border-line rounded-lg px-3.5 py-2.5 text-[15px] outline-none focus:border-accent focus:ring-4 focus:ring-accent/10 transition">
        </div>
      </div>
      <p class="text-[13px] text-slate-500 mt-3">Zatwierdzenie to bramka — kolejny krok nie startuje automatycznie, wymaga tej akcji.</p>

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/problem" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Opis problemu</a>
        <button (click)="confirm()" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Zatwierdź sprzeczność <span aria-hidden="true">→</span></button>
      </div>
    </div>
  `,
})
export class ContradictionPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly params = computed(() => this.store.session()?.parameters ?? this.store.session()?.analysis ?? null);
  action = 'Zmniejszyć grubość ścianki rury';
  improving = '';
  preserving = '';

  ngOnInit() {
    this.store.setStep(0);
    const p = this.params();
    this.improving = p?.improving?.name ?? 'Mniejsza waga';
    this.preserving = p?.preserving?.name ?? 'Niższa wytrzymałość';
  }

  confirm() { this.router.navigate(['/mapping']); }
}
