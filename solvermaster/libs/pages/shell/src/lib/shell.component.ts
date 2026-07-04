import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { SessionStore, STEPS } from '@solvermaster/data-access';
import { AppHeaderComponent, SkeletonLoaderComponent, StepperComponent } from '@solvermaster/ui';

@Component({
  selector: 'sm-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, AppHeaderComponent, StepperComponent, SkeletonLoaderComponent],
  template: `
    <sm-app-header [automode]="store.automode()" />
    <main class="max-w-[1120px] mx-auto px-8 py-10">
      <sm-stepper [steps]="steps" [current]="store.stepIndex()" [reached]="store.maxStep()" [analyzing]="analyzingStep()" (stepSelect)="goToStep($event)" />

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
  private readonly router = inject(Router);
  readonly steps = STEPS.map((s) => ({ label: s.label }));

  /** Step the agent is currently working toward (the frontier), or -1 when idle. */
  readonly analyzingStep = computed(() => {
    if (!this.store.agentRunning()) return -1;
    const next = this.store.maxStep() + 1;
    return next < STEPS.length ? next : -1;
  });

  constructor() {
    // Agent-driven navigation: when a `ui:show` directive arrives, the store sets
    // pendingRoute and we navigate there — no button clicks between steps.
    effect(() => {
      const route = this.store.pendingRoute();
      if (route && this.router.url.split('?')[0] !== route) {
        this.router.navigateByUrl(route);
      }
    });
  }

  /** Jump to any already-reached step (back or forward) from the stepper. */
  goToStep(index: number) {
    if (index < 0 || index > this.store.maxStep() || index === this.store.stepIndex()) return;
    this.store.setStep(index);
    this.router.navigateByUrl('/' + STEPS[index].key);
  }
}
