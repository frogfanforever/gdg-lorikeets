import { ChangeDetectionStrategy, Component } from '@angular/core';

interface TypeRow {
  sample: string;
  sampleClass: string;
  spec: string;
}

/**
 * Type-scale specimen (Figma: "Typography — Agent TRIZ"). Documentation-only —
 * rendered by the Foundations/Typography story, not exported from the UI barrel.
 */
@Component({
  selector: 'sm-type-specimen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[980px] grid gap-9 text-ink">
      @for (r of rows; track r.spec) {
        <div class="grid md:grid-cols-2 gap-x-8 gap-y-2 items-baseline border-b border-line/70 pb-8 last:border-0">
          <div [class]="r.sampleClass">{{ r.sample }}</div>
          <div class="font-mono text-[12px] leading-[17px] text-slate-400">{{ r.spec }}</div>
        </div>
      }
    </div>
  `,
})
export class TypeSpecimenComponent {
  readonly rows: TypeRow[] = [
    {
      sample: 'Interfejs agenta TRIZ',
      sampleClass: 'text-[40px] font-semibold leading-[42px] tracking-[-0.025em]',
      spec: 'Heading/Hero — Inter SemiBold 40/42, -2.5%',
    },
    {
      sample: 'Opisz problem techniczny',
      sampleClass: 'text-[30px] font-semibold leading-[36px] tracking-[-0.02em]',
      spec: 'Heading/H1 — Inter SemiBold 30/36, -2%',
    },
    {
      sample: 'Opisz krótko, na czym polega trudność.',
      sampleClass: 'text-[16px] font-normal leading-[26px]',
      spec: 'Body/Default — Inter Regular 16/26',
    },
    {
      sample: 'Umiarkowana pewność — przewaga 0.25 pkt.',
      sampleClass: 'text-[15px] font-normal leading-[24px] text-slate-500',
      spec: 'Body/Muted — Inter Regular 15/24, slate/500',
    },
    {
      sample: 'KROK 01 · SFORMUŁOWANIE SPRZECZNOŚCI',
      sampleClass: 'font-mono text-[11px] leading-[15px] uppercase tracking-[0.16em] text-accent',
      spec: 'Label/Eyebrow Mono — JetBrains Mono 11/15, uppercase, +16%, accent/400',
    },
    {
      sample: 'Sformułuj sprzeczność',
      sampleClass: 'text-[14px] font-medium leading-[17px]',
      spec: 'Button/Label — Inter Medium 14/17',
    },
    {
      sample: '126 znaków',
      sampleClass: 'font-mono text-[12px] leading-[17px] text-slate-400',
      spec: 'Caption/Mono — JetBrains Mono 12/17, slate/400',
    },
  ];
}
