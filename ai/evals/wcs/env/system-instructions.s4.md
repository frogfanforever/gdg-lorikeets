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

---

## Reach for the ideal (graded — partial credit for "acceptable", zero for "wrong")

Unlike everything above (pass/fail), these are scored on a **range** — there's a best, an acceptable, and a wrong. Aim for the best:

- Component decorator MUST not have the `changeDetection` property at all (`OnPush` is the modern default). Setting `OnPush` explicitly is acceptable; `Default` / `Eager` is wrong.
- Component decorator MUST not have the `standalone` property at all (standalone is the default). `standalone: true` is acceptable; `standalone: false`.
- Declare data models in `*.model.ts` must export the typescript kind: `TypeAliasDeclaration` (an `InterfaceDeclaration` is acceptable; a `ClassDeclaration` is wrong).
- Models are pure data: every property MUST have `readonly` modifier, with no methods / getters / setters.

## Forms — use Signal Forms (this API is NEW; follow the example EXACTLY)

Signal Forms (`@angular/forms/signals`) are the modern, signals-first forms API — NOT
`ReactiveFormsModule`, NOT template-driven forms. You hold the data in a plain writable `signal()`,
wrap it with `form()`, and read ALL form state (values, validity, touched, errors, submitting) as
signals. Import from `@angular/forms/signals`, never `@angular/forms`.

- Build forms with **Signal Forms**. Hold the data in a **writable** `signal()` model and wrap it with
  `form(model, schema, options)`. Import ONLY `form`, `FormField`, `FormRoot`, and the validators you use
  (`required`, `email`, `minLength`, `maxLength`, `min`, `max`, `pattern`). There is NO `field` export and
  NO `FormSignal` export. Do NOT annotate the `form()` result type — let it infer.
- The model MUST be a **writable `signal()`**, never a `computed()` (the form writes back into it). To
  **edit existing data**, create the signal with empty defaults and `.set()` the whole model ONCE the
  fetched data arrives (e.g. in an `effect()` reading a `toSignal()` of the GET) — never `.subscribe()` +
  assign field-by-field, and never make the model a `computed()`.
- Bind the `<form>` with `[formRoot]` and each input with `[formField]` (import `FormRoot` + `FormField`).
  `[formRoot]` sets `novalidate`, prevents the default submit, and runs the action ONLY when valid — do
  NOT add a `(submit)` / `(ngSubmit)` handler. Put submission on the `submission.action` option; inside it
  make the one-shot call with `await firstValueFrom(...)`, `return` nothing on success (run side effects
  like navigation there), and `return { kind, message }` on failure.
- `[formField]` adapts to every control — `type="text|email|password|number|date|time"`, `<textarea>`,
  `<select>` (static or `@for` options), single `<input type="checkbox">` (boolean field), and radio
  groups (same `[formField]` on each `<input type="radio">`; the chosen input's `value` becomes the field
  value). Number inputs coerce to numbers; date/time store `YYYY-MM-DD` / `HH:mm` strings.
- Declare validation ONCE in the schema callback — never hand-roll validation in the component or
  template. Use `required` / `email` / `minLength` / `maxLength` / `min` / `max` / `pattern`, each with an
  optional `{ message }`.
- Render from the form's BUILT-IN state — field errors via `myForm.<field>().errors()` (guarded by
  `.touched()` / `.invalid()`), field flags `.value()` / `.valid()` / `.dirty()` / `.disabled()` /
  `.pending()`, server errors via `myForm().errors()`, and the submit button via `myForm().submitting()` /
  `myForm().invalid()`. Do NOT hand-roll loading/error/success signals, do NOT wire `[value]`+`(input)`
  manually, and do NOT use `FormGroup` / `FormControl` / `FormBuilder` / `formControlName` / `ngModel`.

```ts
interface Credentials { email: string; password: string; }

protected readonly model = signal<Credentials>({ email: '', password: '' });
protected readonly myForm = form(
  this.model,
  (path) => {
    required(path.email, { message: 'Email is required' });
    email(path.email, { message: 'Enter a valid email address' });
    required(path.password, { message: 'Password is required' });
    minLength(path.password, 8, { message: 'At least 8 characters' });
  },
  {
    submission: {
      action: async (field) => {
        try {
          await firstValueFrom(this.service.save(field().value()));
          this.router.navigate(['/']); // success side effect
          return; // success
        } catch {
          return { kind: 'serverError', message: 'Submission failed' };
        }
      },
    },
  },
);
```

```html
<form [formRoot]="myForm">
  <label>
    Email
    <input type="email" [formField]="myForm.email" />
  </label>
  @if (myForm.email().touched() && myForm.email().invalid()) { @for (err of
  myForm.email().errors(); track err) {
  <p class="text-red-600 text-sm">\{{ err.message }}</p>
  } }

  <label>
    Password
    <input type="password" [formField]="myForm.password" />
  </label>

  <button
    type="submit"
    [disabled]="myForm().invalid() || myForm().submitting()"
  >
    @if (myForm().submitting()) { Saving… } @else { Save }
  </button>
</form>
```

## Services — use the `@Service` decorator (this is a CUSTOM house API; follow the example EXACTLY)

- Decorate EVERY service class with **`@Service()`** imported from `./service` — NOT `@Injectable`.
  `@Service` is this project's decorator: it bakes in root, tree-shakable provision, so you write no
  `providedIn`. It is NOT an Angular export and is NOT something you've seen before — use it as shown, do
  not invent options for it.
- Never write `@Injectable` here. For reference of what `@Service` replaces (worst → best):
  empty `@Injectable()` (no `providedIn` — strictly avoid) → `@Injectable({ providedIn: 'platform' })`
  → `@Injectable({ providedIn: 'root' })` → **`@Service()`**.
- Inject dependencies with `inject()` into `readonly` fields, exactly as before.

```ts
import { inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Service } from "./service";

@Service()
export class UserService {
  readonly #http = inject(HttpClient);

  readonly users = () => this.#http.get<User[]>("/api/users");
}
```
