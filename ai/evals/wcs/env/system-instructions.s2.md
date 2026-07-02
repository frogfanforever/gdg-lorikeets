Follow instructions below CAREFULLY:

- Code MUST be implemented in Angular.
- Put the component code inside `src/app/app.ts`
- Component class MUST always be named `App`
- Component's selector MUST always be "app-root" (the `selector: 'app-root'` MUST be present in the "@Component" decorator)
- Use standalone components, do NOT generate NgModules
- Generate the template code inside a separate HTML file and link it in the `template` field of the `App` component
- Generate the styling code inside a separate CSS file and link it in the `styleUrl` field of the `App` component
- Use Tailwind CSS
- Completeness: include all necessary code to run independently
- Use comments sparingly and only for complex parts of the code
- Make sure the generated code is **complete** and **runnable**
- Make sure the generated code contains a **complete** implementation of the `App` class
- Do NOT generate `bootstrapApplication` calls
- If the task requires to fetch data using `HttpClient` make sure to use `provideHttpClient()` in `bootstrapApplication` providers
- Do NOT modify `src/main.ts` or `src/mock-backend.ts`. The mock backend already responds to every endpoint these tasks use (including `/comments/:id`) — reach it through `HttpClient`, and never edit it
- Do not assume globals like (`new Date()`) are available.
- Do not write arrow functions in templates (they are not supported).
- Do not write Regular expressions in templates (they are not supported).

You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

Write code that produces ZERO violations. Specifically:

### TypeScript

- Always make components standalone with `changeDetection: ChangeDetectionStrategy.OnPush`; never use NgModules or the default change detection.
- Always inject dependencies with `inject()`; never use constructor-parameter injection.
- Always declare inputs with `input()` and outputs with `output()`; never use `@Input()` / `@Output()` decorators or the `inputs:` / `outputs:` metadata arrays. Outputs must be `readonly`.
- Always use `model()` for two-way bound state.
- Do NOT rename inputs or outputs (no alias string), do NOT prefix outputs with `on`, and do NOT name an output after a native DOM event (e.g. `click`).
- Every `computed()` must return a value on all code paths.
- Never declare an empty lifecycle hook. Do NOT add `ngOnInit` just to fetch data — fetch at field initialization with `toSignal()` instead. Only add a lifecycle hook when it has a real body, and when you do, implement its interface (`ngOnInit` → `implements OnInit`).
- Services use `@Injectable({ providedIn: 'root' })`.
- Pipes implement `PipeTransform`.
- Always use the `host` metadata object for host bindings/listeners; never use `@HostBinding` / `@HostListener`.
- `templateUrl` / `styleUrl` paths must start with `./` or `../`.
- No duplicate entries in `imports` / `providers` / other metadata arrays.
- Never use the `any` type. Don't annotate types the compiler can already infer (write `count = 0`, not `count: number = 0`).

### Templates

- Use native control flow `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor` / `*ngSwitch` or `CommonModule` directives. Every `@for` needs a `track`, pair it with an `@empty` block, and use `@else` instead of a second negated `@if`. Use `@for`'s contextual variables (`$index`, `$count`, …) rather than aliasing them.
- Always use `[class]` / `[class.x]` for classes and `[style.x]` for styles; never use `ngClass`, `ngStyle`, or a static `style="…"` attribute.
- Self-close empty elements (`<app-thing />`), and never repeat the same attribute on one element.
- Write two-way bindings as `[(x)]` (banana-in-box), use `===` / `!==` in template expressions, and never negate an async pipe.
- No `$any()` in templates.
- On every `<img>`, always use `[ngSrc]`; never use `src`, `[src]`, or `[attr.src]`. (`[ngSrc]` needs `NgOptimizedImage` in the component `imports`, plus `width` + `height`, or `fill`.)
- Every `<button>` needs an explicit `type`.
- Keep templates accessible: `alt` on images, every form control associated with a label, valid ARIA roles/attributes, and a keyboard handler wherever there is a click handler.

---

## Custom Rules

House style **beyond** angular-eslint — opinions the official linter does not (yet) enforce. Hold them to the same **ZERO violations** bar as everything above.

- Always declare component queries with the signal functions `viewChild()` / `viewChildren()` / `contentChild()` / `contentChildren()`; never use the `@ViewChild()` / `@ContentChild()` decorators. (Same principle as inputs/outputs above: signal functions, never decorators.)
- Always update a signal with `.set()` / `.update()`; never call `.mutate()`.
- Keep `computed()` and signal `update()` callbacks pure: derive and return the new value, never assign to `this.x` inside them.
- For data you display, always turn the Observable into a signal with `toSignal()` (or the `async` pipe) — never hand-roll `stream$.subscribe(v => this.sig.set(v))`, which leaks and reimplements reactivity. For a one-shot action (a login/save POST/PUT), it's fine to `.subscribe()` and `.set()` a flag/result on completion — just make sure the subscription can't leak (`take(1)` / `DestroyRef` / component teardown).
- Always read route parameters reactively via `route.paramMap`; never `route.snapshot`.
- Always format values with built-in pipes (`DatePipe`, `CurrencyPipe`, …) in the template; never hand-roll `toFixed` / `toLocaleDateString` or manual string building in the component.
