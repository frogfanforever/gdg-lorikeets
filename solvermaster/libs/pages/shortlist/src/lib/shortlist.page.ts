import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SessionStore } from '@solvermaster/data-access';
import { StepTitleComponent } from '@solvermaster/ui';

interface ShortItem {
  rank: string;
  name: string;
  merged?: string;
  description: string;
  tags: { label: string; value: string }[];
  lead?: boolean;
}

const ITEMS: ShortItem[] = [
  {
    rank: '01',
    name: 'Materiały kompozytowe',
    merged: 'scalono ×2',
    description: 'Najsilniejsza eliminacja sprzeczności; dwa niezależne źródła wskazały drogę materiałową.',
    tags: [{ label: 'TRIZ', value: '40' }, { label: 'SCMP', value: 'Substitute' }],
    lead: true,
  },
  {
    rank: '02',
    name: 'Segmentacja',
    description: 'Modułowa budowa podnosi wykonalność i dostęp do zasobów systemu.',
    tags: [{ label: 'TRIZ', value: '01' }],
  },
  {
    rank: '03',
    name: 'SCAMPER: Combine',
    description: 'Funkcja amortyzacji wbudowana w ramę — najwyższy przyrost idealności.',
    tags: [{ label: 'SCMP', value: 'Combine' }],
  },
  {
    rank: '04',
    name: 'Koncept własny',
    description: 'Hybryda aluminium/kompozyt; zrównoważony profil bez słabych stron.',
    tags: [{ label: 'TY', value: 'ręczny' }],
  },
];

@Component({
  selector: 'sm-shortlist-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StepTitleComponent],
  template: `
    <div class="max-w-[900px] mx-auto">
      <sm-step-title eyebrow="Krok 04 · Shortlist" title="Połączone najlepsze pomysły">
        System scalił kandydatów ze wszystkich metod, usunął duplikaty i przygotował listę do oceny.
      </sm-step-title>

      <div class="flex items-start gap-3 rounded-lg border border-accent/30 bg-accent-soft px-4 py-3 text-[13px] text-accent-ink mb-7">
        <span class="font-mono shrink-0 mt-px">⋔</span>
        <p><b class="font-semibold">5 wygenerowanych → 4 unikalne.</b> „Substitute — tytanowe łączniki” uznano za wariant materiałowy i scalono z „Materiały kompozytowe”.</p>
      </div>

      <div class="grid gap-3">
        @for (item of items; track item.rank) {
          <div class="bg-surface border border-line rounded-xl p-5 shadow-[0_1px_2px_rgba(12,14,20,0.04),0_8px_24px_-16px_rgba(12,14,20,0.25)] flex items-start gap-4">
            <span class="font-mono text-[13px] w-8 h-8 shrink-0 grid place-items-center rounded-md font-semibold"
              [class]="item.lead ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500'">{{ item.rank }}</span>
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-[15px] font-semibold">{{ item.name }}</span>
                @if (item.merged) { <span class="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent-soft text-accent-ink">{{ item.merged }}</span> }
              </div>
              <p class="text-[13px] text-slate-500 leading-relaxed">{{ item.description }}</p>
              <div class="flex flex-wrap gap-1.5 mt-3">
                @for (t of item.tags; track t.label) {
                  <span class="inline-flex items-center gap-1.5 border border-line bg-white rounded-full pl-2 pr-2.5 py-1 text-[12px]"><span class="font-mono text-[10px] text-slate-400">{{ t.label }}</span>{{ t.value }}</span>
                }
              </div>
            </div>
          </div>
        }
      </div>

      <div class="flex items-center justify-between gap-3 mt-9 pt-6 border-t border-line">
        <a routerLink="/analysis" class="inline-flex items-center gap-2 border border-line bg-white hover:bg-slate-50 text-[14px] font-medium px-4 py-2.5 rounded-lg text-slate-600 transition"><span aria-hidden="true">←</span> Analiza</a>
        <a routerLink="/result" class="inline-flex items-center gap-2 bg-accent hover:bg-accent-ink text-white text-[14px] font-medium px-5 py-2.5 rounded-lg shadow-sm transition">Przejdź do wyniku <span aria-hidden="true">→</span></a>
      </div>
    </div>
  `,
})
export class ShortlistPage implements OnInit {
  readonly store = inject(SessionStore);
  readonly items = ITEMS;

  ngOnInit() { this.store.setStep(3); }
}
