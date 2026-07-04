import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Swatch {
  name: string;
  token: string;
  hex: string;
  note?: string;
}
interface SwatchGroup {
  title: string;
  swatches: Swatch[];
}

/**
 * Color palette specimen for the Agent TRIZ design system. Documentation-only —
 * rendered by the Foundations/Colors story, not exported from the UI barrel.
 * Values mirror the Tailwind theme (tailwind.config.js) and the Figma tokens
 * (accent/400, slate/400–600, ink/200).
 */
@Component({
  selector: 'sm-color-palette',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-[980px] grid gap-10 text-ink">
      @for (g of groups; track g.title) {
        <section>
          <div class="flex items-center gap-3 mb-4">
            <span class="font-mono text-[11px] uppercase tracking-[0.14em] text-slate-500">{{ g.title }}</span>
            <span class="h-px flex-1 bg-line"></span>
          </div>
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            @for (s of g.swatches; track s.token) {
              <div class="rounded-xl border border-line bg-surface overflow-hidden shadow-[0_1px_2px_rgba(12,14,20,0.04)]">
                <div class="h-20 border-b border-line/60" [style.background]="s.hex"></div>
                <div class="p-3">
                  <div class="text-[13px] font-medium leading-tight">{{ s.name }}</div>
                  <div class="font-mono text-[11px] text-slate-500 mt-1">{{ s.token }}</div>
                  <div class="font-mono text-[11px] text-slate-400 uppercase">{{ s.hex }}</div>
                  @if (s.note) { <div class="text-[11px] text-slate-500 mt-1.5 leading-snug">{{ s.note }}</div> }
                </div>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
})
export class ColorPaletteComponent {
  readonly groups: SwatchGroup[] = [
    {
      title: 'Brand · Accent',
      swatches: [
        { name: 'Accent', token: 'accent (accent/400)', hex: '#2f5cff', note: 'Primary actions, active state, links.' },
        { name: 'Accent ink', token: 'accent-ink (accent/500)', hex: '#2247d6', note: 'Hover / pressed on accent.' },
        { name: 'Accent soft', token: 'accent-soft', hex: '#e9edff', note: 'Tinted fills, badges, callouts.' },
      ],
    },
    {
      title: 'Neutrals · Surface',
      swatches: [
        { name: 'Ink', token: 'ink', hex: '#0c0e14', note: 'Primary text, dark UI chips.' },
        { name: 'Surface', token: 'surface', hex: '#ffffff', note: 'Cards, panels, inputs.' },
        { name: 'Paper', token: 'paper', hex: '#eceff4', note: 'App background.' },
        { name: 'Line', token: 'line (ink/200)', hex: '#d7dce4', note: 'Borders, dividers.' },
      ],
    },
    {
      title: 'Text · Slate scale',
      swatches: [
        { name: 'Slate 600', token: 'slate-600', hex: '#475569', note: 'Secondary button text.' },
        { name: 'Slate 500', token: 'slate-500', hex: '#64748b', note: 'Muted body, captions.' },
        { name: 'Slate 400', token: 'slate-400', hex: '#94a3b8', note: 'Mono labels, hints.' },
        { name: 'Slate 100', token: 'slate-100', hex: '#f1f5f9', note: 'Neutral fills.' },
        { name: 'Slate 50', token: 'slate-50', hex: '#f8fafc', note: 'Hover on white.' },
      ],
    },
  ];
}
