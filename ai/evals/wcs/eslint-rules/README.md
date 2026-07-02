# eslint-rules

The workshop's custom **ESLint rules** — the *detection* layer. Each rule looks at generated
Angular code and reports findings; it does **not** decide a score.

This is deliberately separate from the **evals**. The split:

| `eslint-rules/` (here) | `env/ratings/` |
| --- | --- |
| *What does the code do?* | *How good is that?* |
| Plain ESLint rules on the Angular template / TS AST | WCS `Rating`s that run a rule and return a 0–1 coefficient |
| Reusable, framework-agnostic detection | Scoring policy + tier weights |

The only coupling between the two is **rule id / messageId → score**.

## Layout

```
forms/form-strategy.rule.mjs                  classifies form bindings into tiers (messageIds)
reactive/require-subscription-teardown.rule.mjs   bare .subscribe() with no teardown
reactive/prefer-to-signal.rule.mjs            subscribe + this.x.set() → should be toSignal()
formatting/prefer-built-in-pipe.rule.mjs      manual toFixed/toLocale... in a component
angular-best-practices.config.mjs             curated UPSTREAM angular-eslint flat-config
index.mjs                                      assembles the plugin + ready flat-config fragments
```

Every rule is AST-only (no type info), so it runs on in-memory file content via eslint's
synchronous `Linter` — no tsconfig, no disk, no fork of angular-eslint. `index.mjs` exports
`wcsAngularPlugin` plus the config fragments (`formStrategyConfig`, `reactiveConfig`,
`formattingConfig`, `angularBestPracticesConfig`) that the ratings consume.
