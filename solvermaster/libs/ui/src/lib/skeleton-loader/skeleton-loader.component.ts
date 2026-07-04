import {
  ChangeDetectionStrategy,
  Component,
  Input,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { randomQuote } from '../loading-quotes';

/**
 * Animated skeleton + rotating "loading quote", shown between wizard steps.
 * Shimmer bars fake the incoming content; a random status line cycles with a fade.
 */
@Component({
  selector: 'sm-skeleton-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="sk" role="status" aria-live="polite">
      <div class="bars">
        @for (w of widths; track $index) {
          <div class="bar" [style.width.%]="w"></div>
        }
      </div>
      <div class="quote" [class.show]="visible()">
        <span class="spinner" aria-hidden="true"></span>
        <span class="text">{{ quote() }}…</span>
      </div>
    </div>
  `,
  styles: [`
    .sk { display: flex; flex-direction: column; gap: 1rem; padding: 1.25rem;
          border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; }
    .bars { display: flex; flex-direction: column; gap: .7rem; }
    .bar {
      height: 14px; border-radius: 7px;
      background: linear-gradient(90deg, #eceff3 25%, #f6f8fa 37%, #eceff3 63%);
      background-size: 400% 100%;
      animation: shimmer 1.4s ease-in-out infinite;
    }
    .bar:nth-child(odd) { animation-delay: .15s; }
    @keyframes shimmer { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }

    .quote { display: flex; align-items: center; gap: .6rem; min-height: 1.4rem;
             color: #475569; font-size: .95rem; opacity: 0; transform: translateY(4px);
             transition: opacity .35s ease, transform .35s ease; }
    .quote.show { opacity: 1; transform: translateY(0); }
    .text { font-variant-numeric: tabular-nums; }

    .spinner { width: 14px; height: 14px; border-radius: 50%; flex: 0 0 auto;
               border: 2px solid #cbd5e1; border-top-color: #2b6cb0;
               animation: spin .8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    @media (prefers-reduced-motion: reduce) {
      .bar, .spinner { animation: none; }
      .quote { transition: none; }
    }
  `],
})
export class SkeletonLoaderComponent implements OnInit, OnDestroy {
  /** number of shimmer bars */
  @Input() lines = 4;
  /** ms between quote changes */
  @Input() interval = 1900;

  readonly widths = [92, 78, 85, 64, 96, 70];
  readonly quote = signal(randomQuote());
  readonly visible = signal(true);
  private timer?: ReturnType<typeof setInterval>;

  ngOnInit(): void {
    this.widths.length = Math.max(2, Math.min(this.lines, this.widths.length));
    this.timer = setInterval(() => {
      // fade out → swap → fade in
      this.visible.set(false);
      setTimeout(() => {
        this.quote.set(randomQuote(this.quote()));
        this.visible.set(true);
      }, 300);
    }, this.interval);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }
}
