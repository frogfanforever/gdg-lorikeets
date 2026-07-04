import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SessionStore, STEPS } from '@solvermaster/data-access';
import { AppHeaderComponent, SkeletonLoaderComponent, StepperComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeaderComponent, StepperComponent, SkeletonLoaderComponent],
  template: `
    <sm-app-header />
    <main class="max-w-[1120px] mx-auto px-8 py-10">
      <sm-stepper [steps]="steps" [current]="store.stepIndex()" />

      @if (store.error()) {
        <p class="mb-6 font-mono text-[12px] text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">⚠ {{ store.error() }}</p>
      }

      <router-outlet />
    </main>

    @if (store.busy()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-paper/70 backdrop-blur-sm">
        <div class="w-[min(520px,90vw)]"><sm-skeleton-loader [lines]="4" /></div>
      </div>
    }
  `,
})
export class ShellComponent {
  readonly store = inject(SessionStore);
  readonly steps = STEPS.map((s) => ({ label: s.label }));
}
