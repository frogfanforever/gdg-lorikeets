import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'sm-step-title',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="mb-8">
      <div class="font-mono text-[11px] uppercase tracking-[0.16em] text-accent mb-2.5">{{ eyebrow }}</div>
      <h1 class="text-[30px] font-semibold tracking-[-0.02em] leading-tight">{{ title }}</h1>
      <p class="text-[15px] text-slate-500 mt-3 max-w-[62ch] leading-relaxed"><ng-content></ng-content></p>
    </div>
  `,
})
export class StepTitleComponent {
  @Input() eyebrow = '';
  @Input() title = '';
}
