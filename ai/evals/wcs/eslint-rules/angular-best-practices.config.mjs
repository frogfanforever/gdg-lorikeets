import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/**
 * Curated UPSTREAM angular-eslint flat-config — the Angular/TS best practices from the
 * system prompt, expressed as real angular-eslint rules. No custom rules here; this is a
 * selection + tuning of rules that ship with angular-eslint. The eval that runs it is
 * env/ratings/angular-eslint.rating.mjs (it scores the violation count).
 *
 * Every angular-eslint rule below is AST-based (none require type info), so they run on the
 * in-memory file content a rating receives — no tsconfig / TS program needed.
 *
 * Deliberately OMITTED (they conflict with the entry tasks' own constraints):
 *   - component-class-suffix / use-component-selector  → tasks mandate class `App`, selector `app-root`
 *   - prefer-inline-templates                           → tasks mandate a separate app.html
 */
export const angularBestPracticesConfig = tseslint.config(
  // ---------------------------------------------------------------- TypeScript
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    // `tsRecommended` already turns on: prefer-inject, prefer-standalone,
    // prefer-on-push-component-change-detection, no-empty-lifecycle-method,
    // contextual-lifecycle, no-input-rename, no-output-rename, no-output-native,
    // no-output-on-prefix, no-inputs/outputs-metadata-property, use-pipe-transform-interface.
    extends: [...angular.configs.tsRecommended],
    rules: {
      // ── TypeScript Best Practices ──
      '@typescript-eslint/no-explicit-any': 'error', // "Avoid the any type"
      '@typescript-eslint/no-inferrable-types': 'error', // "Prefer type inference when obvious"

      // ── Angular Best Practices: signals-first APIs ──
      '@angular-eslint/prefer-inject': 'error', // inject() over constructor DI
      '@angular-eslint/prefer-signal-model': 'error', // model() for two-way binding
      '@angular-eslint/prefer-output-emitter-ref': 'error', // output() over @Output()
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/computed-must-return': 'error', // computed() correctness
      // NOTE: `prefer-signals` (signals over @Input/@ViewChild) and `no-uncalled-signals`
      // (mySignal vs mySignal()) are TYPE-AWARE — they call getParserServices() and need a
      // real TS program, which a rating doesn't have (only in-memory file content). Enabling
      // them throws. These two are exactly the rules that would require the on-disk-tsconfig
      // executor route to enforce. Left off here on purpose.

      // ── Components / Services ──
      '@angular-eslint/use-lifecycle-interface': 'error', // implements OnInit when using ngOnInit
      '@angular-eslint/use-injectable-provided-in': 'error', // providedIn: 'root'
      '@angular-eslint/prefer-host-metadata-property': 'error', // no @HostBinding/@HostListener
      '@angular-eslint/relative-url-prefix': 'error', // ./ ../ for external template/style paths

      // ── Correctness, enabled because they're right (not in the prompt) ──
      '@angular-eslint/no-duplicates-in-metadata-arrays': 'error',

      // ── Replaced by our opinionated TIERED ratings (change-detection / standalone) ──
      // tsRecommended turns these ON, but they only allow/deny — they can't express that
      // OMITTING the key beats declaring it. The custom `component-decorator-strategy` rule
      // + change-detection.rating / standalone.rating grade the tiers instead. Off to avoid
      // double-counting and the contradictory "prefer OnPush" signal.
      '@angular-eslint/prefer-on-push-component-change-detection': 'off',
      '@angular-eslint/prefer-standalone': 'off',
    },
  },

  // ---------------------------------------------------------------- Templates
  {
    files: ['**/*.html'],
    languageOptions: {
      parser: angular.templateParser,
    },
    // `templateRecommended`: prefer-control-flow, banana-in-box, eqeqeq, no-negated-async.
    // `templateAccessibility`: the whole a11y section (alt-text, label-has-associated-control,
    // valid-aria, role-has-required-aria, click-events-have-key-events, etc.).
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      // ── Angular Best Practices / Templates ──
      '@angular-eslint/template/prefer-ngsrc': 'error', // NgOptimizedImage for static images
      '@angular-eslint/template/prefer-class-binding': 'error', // no ngClass → [class]
      '@angular-eslint/template/no-any': 'error', // no $any in templates
      // No ngStyle / static style="" — but ALLOW [style.x] bindings (what the prompt wants).
      '@angular-eslint/template/no-inline-styles': [
        'error',
        { allowNgStyle: false, allowBindToStyle: true },
      ],

      // ── Correctness, enabled because they're right (not in the prompt) ──
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      // NOTE: `no-call-expression` is intentionally OFF — it flags ALL template function
      // calls, including signal reads (`mySignal()`), which the system prompt explicitly
      // wants. It predates signals and contradicts a signals-first codebase.
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-contextual-for-variables': 'error',
      '@angular-eslint/template/prefer-at-empty': 'error',
      '@angular-eslint/template/prefer-at-else': 'error',
    },
  },
);
