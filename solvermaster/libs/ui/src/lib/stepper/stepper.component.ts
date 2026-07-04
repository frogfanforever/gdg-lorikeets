import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export interface Step { label: string }

@Component({
  selector: 'sm-stepper',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Kroki" class="mb-11">
      <ol class="grid grid-cols-3 md:grid-cols-5 gap-x-3 gap-y-5">
        @for (s of steps; track $index) {
          <li>
            <div class="flex items-center gap-2.5">
              <span
                class="w-7 h-7 shrink-0 rounded-full grid place-items-center font-mono text-[12px] font-semibold transition"
                [class]="$index < current
                  ? 'bg-ink text-white'
                  : $index === current
                    ? 'bg-accent text-white shadow-[0_0_0_4px_rgba(47,92,255,0.15)]'
                    : 'bg-white border border-line text-slate-400'">{{ $index < current ? '✓' : $index + 1 }}</span>
              <div class="min-w-0">
                <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Krok {{ ($index + 1).toString().padStart(2, '0') }}</div>
                <div class="text-[13px] font-medium truncate"
                  [class]="$index === current ? 'text-ink' : $index < current ? 'text-slate-600' : 'text-slate-500'">{{ s.label }}</div>
              </div>
            </div>
            <div class="mt-2.5 h-[3px] rounded-full" [class]="$index <= current ? 'bg-accent' : 'bg-line'"></div>
          </li>
        }
      </ol>
    </nav>
  `,
})
export class StepperComponent {
  @Input() steps: Step[] = [];
  @Input() current = 0;
}
