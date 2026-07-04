import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

export type ButtonVariant = 'primary' | 'secondary';

/**
 * Design-system button (Figma: "Buttons — Agent TRIZ").
 * - primary:   bg accent/400, hover accent/500, white text, padding 20/10
 * - secondary: white bg, ink/200 border, slate/600 text, hover slate/50, padding 16/10
 * Both: Inter Medium 14/17, radius 8. Project the label (and any ←/→) as content.
 */
@Component({
  selector: 'sm-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button [attr.type]="type" [disabled]="disabled" [class]="classes">
      <ng-content></ng-content>
    </button>
  `,
})
export class ButtonComponent {
  @Input() variant: ButtonVariant = 'primary';
  @Input() type: 'button' | 'submit' | 'reset' = 'button';
  @Input() disabled = false;

  private readonly base =
    'inline-flex items-center justify-center gap-2 text-[14px] font-medium leading-[17px] rounded-lg transition disabled:opacity-50 disabled:pointer-events-none';

  private readonly variantClasses: Record<ButtonVariant, string> = {
    primary: 'bg-accent hover:bg-accent-ink text-white px-5 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
    secondary: 'border border-line bg-white hover:bg-slate-50 text-slate-600 px-4 py-2.5',
  };

  get classes(): string {
    return `${this.base} ${this.variantClasses[this.variant]}`;
  }
}
