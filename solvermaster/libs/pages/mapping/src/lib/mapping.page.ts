import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs';
import { Param, SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

const EX_IMP: Param[] = [
  { id: 1, name: 'Waga ruchomego obiektu', confidence: 0.81 },
  { id: 5, name: 'Powierzchnia ruchomego obiektu', confidence: 0.44 },
  { id: 8, name: 'Objętość nieruchomego obiektu', confidence: 0.33 },
  { id: 21, name: 'Moc', confidence: 0.19 },
];
const EX_PRE: Param[] = [
  { id: 14, name: 'Wytrzymałość', confidence: 0.92 },
  { id: 11, name: 'Naprężenie', confidence: 0.71 },
  { id: 36, name: 'Złożoność urządzenia', confidence: 0.54 },
];

@Component({
  selector: 'sm-mapping-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <sm-step-title eyebrow="Krok 02 · Mapowanie na parametry" title="Zweryfikuj mapowanie na parametry TRIZ">
      Agent dopasował efekty do 39 parametrów TRIZ. Zobacz top-5 z wynikiem podobieństwa i skoryguj wybór ręcznie.
    </sm-step-title>

    @for (t of tables(); track t.role) {
      <section class="mb-8">
        <div class="flex items-center gap-3 mb-3">
          <span class="font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500">{{ t.title }}</span>
          <span class="h-px flex-1 bg-line"></span>
        </div>
        <div class="bg-surface border border-line rounded-xl overflow-hidden shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)]">
          <table class="w-full text-[14px]">
            <thead>
              <tr class="bg-slate-50 text-left font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                <th class="px-4 py-3 w-14">#</th><th class="px-4 py-3">Parametr</th>
                <th class="px-4 py-3 w-52">Dopasowanie</th><th class="px-4 py-3 w-40">Status</th>
              </tr>
            </thead>
            <tbody>
              @for (p of t.rows; track p.id) {
                <tr class="border-t border-line cursor-pointer transition"
                    [class]="t.selected() === p.id ? 'bg-accent-soft/70' : 'hover:bg-slate-50'"
                    (click)="t.select(p.id)">
                  <td class="px-4 py-3 font-mono" [class]="t.selected() === p.id ? 'font-semibold border-l-2 border-accent' : ''">{{ pad(p.id) }}</td>
                  <td class="px-4 py-3" [class]="t.selected() === p.id ? 'font-semibold' : ''">{{ p.name }}</td>
                  <td class="px-4 py-3">
                    <div class="flex items-center gap-2.5">
                      <div class="h-1.5 flex-1 rounded-full bg-slate-100">
                        <div class="h-full rounded-full" [class]="t.selected() === p.id ? 'bg-accent' : 'bg-slate-400'" [style.width.%]="(p.confidence || 0) * 100"></div>
                      </div>
                      <span class="font-mono tnum text-[12px] w-9 text-right" [class]="t.selected() === p.id ? 'font-semibold text-accent-ink' : ''">{{ (p.confidence || 0).toFixed(2) }}</span>
                    </div>
                  </td>
                  <td class="px-4 py-3">
                    @if (t.selected() === p.id) {
                      <span class="inline-flex items-center font-mono text-[11px] px-2 py-1 rounded bg-accent text-white">wybrano</span>
                    } @else { <span class="text-slate-400 font-mono text-[11px]">—</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
      <a routerLink="/contradiction" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Sprzeczność</a>
      <button (click)="next()" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Dalej: Generowanie <span aria-hidden="true">→</span></button>
    </div>
  `,
})
export class MappingPage implements OnInit {
  readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  private readonly selImp = signal(0);
  private readonly selPre = signal(0);

  private readonly impRows = computed<Param[]>(() => {
    const a = this.store.session()?.analysis?.improving;
    return a ? [a, ...(a.alternatives ?? [])] : EX_IMP;
  });
  private readonly preRows = computed<Param[]>(() => {
    const a = this.store.session()?.analysis?.preserving;
    return a ? [a, ...(a.alternatives ?? [])] : EX_PRE;
  });

  readonly tables = computed(() => [
    { role: 'imp', title: 'Parametr poprawiany — EP1', rows: this.impRows(), selected: this.selImp, select: (id: number) => this.selImp.set(id) },
    { role: 'pre', title: 'Parametr zachowywany — EP2', rows: this.preRows(), selected: this.selPre, select: (id: number) => this.selPre.set(id) },
  ]);

  pad(n: number) { return n.toString().padStart(2, '0'); }

  ngOnInit() {
    this.store.setStep(1);
    this.selImp.set(this.impRows()[0]?.id ?? 0);
    this.selPre.set(this.preRows()[0]?.id ?? 0);
  }

  next() {
    if (!this.store.hasSession()) { this.router.navigate(['/generation']); return; }
    this.store.setParameters(this.selImp(), this.selPre())
      .pipe(switchMap(() => this.store.matrix()))
      .subscribe({ next: () => this.router.navigate(['/generation']) });
  }
}
