# Users Table (nan-stack)

The purpose of this application is to show a list of users from a stubbed json file and present it using Tailwind and the Angular framework. The data model mirrors the nan-stack NestJS API (`/api/user`).

## File system

You are in greenfield Angular starter app and here are the files

{{> contextFiles '*.md, src/**/*.json, src/**/*.css, src/**/*.html, src/**/*.ts' }}

---

## Endpoints

You must use this endpoint in order to fetch the users.
The JSON file is served locally from the app's `public/` folder, so it is reachable at the app root:
`GET /nan-users.json`

The endpoint will respond with json looking similar to this type:

```ts
  {
    id: number,
    name: string,
    surname: string,
    birthYear: number,
    email: string,
  }[];
```

## Functional Requirements

```gherkin
Given the application fetches users data from the API endpoint
When I navigate to the "/" route
Then I should see the list of users with their full name, email and birth year
```

### Out of Functional Scope

The following are explicitly NOT part of this task so DO NOT attempt to develop these features:

- Error handling (assume the API always succeeds)
- Loading states (no need to show loading indicators)
- Empty state (no need to show info that list is empty)
- Routing (use a single `App` component)

## Tech Stack Requirements (primary — this is what is graded)

This task grades **modern Angular engineering**, not the data. Use the simple CMS
(Component / Model / Service) architecture in a single standalone `App` component
(no routing), and the generated code MUST follow the stack conventions:

- **Standalone component** (no `NgModule`); use the existing `app.ts` / `app.html`.
- **Signals** for all state (`signal`, `computed`); never mutate a signal's value
  in place — always set a new value.
- **OnPush** change detection (`changeDetection: ChangeDetectionStrategy.OnPush`).
- **Model as a `type`** (not `interface`/`class`), with `readonly` fields and no
  methods (pure data shape).
- **Service** `@Injectable({ providedIn: 'root' })` that owns the data fetch via
  **`HttpClient`** (or `httpResource`) — the component must not fetch directly.
- **Reactive** data flow (prefer `toSignal` / `httpResource`); no leftover manual
  subscriptions; do not use `ActivatedRoute.snapshot`.
- If any component I/O is used, use the **`input()` / `output()`** functions, not
  the `@Input()` / `@Output()` decorators.
- **Pure transformations** for derived values (e.g. full name) — pure functions or
  `computed`, no side effects.
- **Accessibility**: semantic, well-labelled table markup (the axe a11y gate is
  scored).
- The project must **build cleanly** and pass **angular-eslint**.

## Data (secondary — keep it minimal)

Render a row per user binding: full name (derived from `name` + `surname`),
`email`, and `birthYear`. Tailwind is already set up; use its utility classes.
Visuals are not graded — correctness and the stack conventions above are.
