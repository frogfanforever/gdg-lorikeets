import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

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
            <button
              type="button"
              [disabled]="$index > reached"
              (click)="stepSelect.emit($index)"
              class="w-full text-left group focus:outline-none disabled:cursor-default"
              [class.cursor-pointer]="$index <= reached && $index !== current"
              [attr.aria-current]="$index === current ? 'step' : null">
              <div class="flex items-center gap-2.5">
                <span
                  class="w-7 h-7 shrink-0 rounded-full grid place-items-center font-mono text-[12px] font-semibold transition"
                  [class]="$index === analyzing
                    ? 'bg-accent text-white shadow-[0_0_0_4px_rgba(47,92,255,0.15)]'
                    : $index < current
                      ? 'bg-ink text-white group-hover:bg-accent-ink'
                      : $index === current
                        ? 'bg-accent text-white shadow-[0_0_0_4px_rgba(47,92,255,0.15)]'
                        : $index <= reached
                          ? 'bg-white border border-line text-slate-500 group-hover:border-accent group-hover:text-ink'
                          : 'bg-white border border-line text-slate-400'">
                  @if ($index === analyzing) {
                    <svg class="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
                    </svg>
                  } @else {
                    {{ $index < current ? '✓' : $index + 1 }}
                  }
                </span>
                <div class="min-w-0">
                  <div class="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-400">Krok {{ ($index + 1).toString().padStart(2, '0') }}</div>
                  <div class="text-[13px] font-medium truncate"
                    [class]="$index === current ? 'text-ink' : $index < current ? 'text-slate-600 group-hover:text-ink' : 'text-slate-500'">{{ s.label }}</div>
                </div>
              </div>
              <div class="mt-2.5 h-[3px] rounded-full" [class]="$index <= current ? 'bg-accent' : 'bg-line'"></div>
            </button>
          </li>
        }
      </ol>
    </nav>
  `,
})
export class StepperComponent {
  @Input() steps: Step[] = [];
  @Input() current = 0;
  /** Furthest step reached; every step up to this is revisitable (back and forward). */
  @Input() reached = 0;
  /** Index of the step currently being analyzed by the agent, or -1 when idle. */
  @Input() analyzing = -1;
  /** Emits the index of a reached step the user clicked to navigate to. */
  @Output() stepSelect = new EventEmitter<number>();
}
