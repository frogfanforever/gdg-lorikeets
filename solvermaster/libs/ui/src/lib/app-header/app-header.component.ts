import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'sm-app-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="sticky top-0 z-20 border-b border-line bg-paper/85 backdrop-blur">
      <div class="max-w-[1120px] mx-auto px-8 h-16 flex items-center justify-between gap-6">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-md bg-ink text-white grid place-items-center font-mono text-[12px] font-semibold">TZ</div>
          <div class="leading-tight">
            <div class="font-mono text-[13px] font-semibold tracking-tight">AGENT&nbsp;TRIZ</div>
            <div class="text-[11px] text-slate-500 -mt-0.5">Rozwiązywanie sprzeczności technicznych</div>
          </div>
        </div>
        <div class="flex items-center gap-2 font-mono text-[11px] text-slate-500">
          <span class="w-1.5 h-1.5 rounded-full bg-accent"></span>przebieg&nbsp;{{ run }}
        </div>
      </div>
    </header>
  `,
})
export class AppHeaderComponent {
  @Input() run = '#A-042';
}
