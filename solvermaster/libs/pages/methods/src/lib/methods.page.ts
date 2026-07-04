import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

interface Method {
  key: 'triz';
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
];

@Component({
  selector: 'sm-methods-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[880px] mx-auto">
      <sm-step-title eyebrow="Krok 02 · Wybór metod" title="Metoda generowania">
        Agent użyje metody TRIZ: wyodrębni sprzeczność techniczną, zmapuje ją na parametry i odczyta zasady wynalazcze z macierzy.
      </sm-step-title>

      <div class="grid gap-4">
        @for (m of methods; track m.key) {
          <div class="relative block bg-surface rounded-xl p-5 border-2 border-accent shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(47,92,255,0.4)]">
            <span class="absolute top-4 right-4 w-6 h-6 rounded-md grid place-items-center font-mono text-[13px] bg-accent text-white">✓</span>
            <div class="flex items-center gap-2 mb-2">
              <span class="text-[16px] font-semibold">{{ m.name }}</span>
              <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">{{ m.badge }}</span>
            </div>
            <p class="text-[13px] text-slate-500 leading-relaxed mb-4">{{ m.description }}</p>
            <div class="flex flex-wrap items-center gap-2 pt-3 border-t border-line">
              <span class="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-400">wymaga</span>
              @for (r of m.requires; track r) {
                <span class="font-mono text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600">{{ r }}</span>
              }
            </div>
          </div>
        }
      </div>

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/problem" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Opis problemu</a>
        <button type="button" (click)="run()" [disabled]="store.busy() || store.automode()"
          class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition disabled:opacity-50 disabled:pointer-events-none">Uruchom analizę <span aria-hidden="true">→</span></button>
      </div>
    </div>
  `,
})
export class MethodsPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);
  readonly methods = METHODS;

  ngOnInit() {
    if (!this.store.hasSession()) { this.router.navigate(['/problem']); return; }
    this.store.setStep(1);
  }

  run() {
    this.store.analyze().subscribe({
      next: () => this.router.navigate(['/analysis']),
    });
  }
}
