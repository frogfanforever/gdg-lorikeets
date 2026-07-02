import angular from 'angular-eslint';
import tseslint from 'typescript-eslint';

/**
 * STANDARD angular-eslint — the off-the-shelf recommended rules, turned on in full. This is the
 * Stage 1 "reuse what the Angular team already wrote" config, kept DELIBERATELY SIMPLE: every rule
 * here is AST-only, so it runs through the same in-memory Linter.verify path as the other ratings —
 * no TS program, no on-disk workspace.
 *
 * How this differs from the curated angular-best-practices.config.mjs (the LATER-STAGE config):
 *   - standalone + change-detection are ON here. The curated config turns them OFF because later
 *     stages grade those two as TIERED ratings — but at Stage 1 we just want the plain angular-eslint
 *     signal. Easy to override later (that's the point of keeping them as separate configs).
 *   - Type-aware rules (no-uncalled-signals, prefer-signals) are NOT included — they need a real TS
 *     Program (getParserServices) which the in-memory rating can't provide. Left for a later stage.
 *
 * OMITTED because they conflict with the entry tasks' fixed constraints (same as the curated config):
 *   - component-class-suffix / use-component-selector  → tasks mandate class `App`, selector `app-root`
 */
export const angularEslintFullConfig = tseslint.config(
  // ---------------------------------------------------------------- TypeScript
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 'latest',
      sourceType: 'module',
    },
    plugins: { '@typescript-eslint': tseslint.plugin },
    // tsRecommended turns on the bulk of the Angular TS best practices (prefer-inject,
    // prefer-standalone, prefer-on-push, no-empty-lifecycle-method, no-input/output-rename,
    // use-pipe-transform-interface, …). We keep prefer-standalone / prefer-on-push ON (see header).
    extends: [...angular.configs.tsRecommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-inferrable-types': 'error',

      '@angular-eslint/prefer-inject': 'error',
      '@angular-eslint/prefer-signal-model': 'error',
      '@angular-eslint/prefer-output-emitter-ref': 'error',
      '@angular-eslint/prefer-output-readonly': 'error',
      '@angular-eslint/computed-must-return': 'error',
      '@angular-eslint/use-lifecycle-interface': 'error',
      '@angular-eslint/use-injectable-provided-in': 'error',
      '@angular-eslint/prefer-host-metadata-property': 'error',
      '@angular-eslint/relative-url-prefix': 'error',
      '@angular-eslint/no-duplicates-in-metadata-arrays': 'error',

      // ── The two the curated config defers to later tiered ratings — ON here (easy to override) ──
      '@angular-eslint/prefer-on-push-component-change-detection': 'error',
      '@angular-eslint/prefer-standalone': 'error',
    },
  },

  // ---------------------------------------------------------------- Templates
  {
    files: ['**/*.html'],
    languageOptions: { parser: angular.templateParser },
    extends: [
      ...angular.configs.templateRecommended,
      ...angular.configs.templateAccessibility,
    ],
    rules: {
      '@angular-eslint/template/prefer-ngsrc': 'error',
      '@angular-eslint/template/prefer-class-binding': 'error',
      '@angular-eslint/template/no-any': 'error',
      '@angular-eslint/template/no-inline-styles': [
        'error',
        { allowNgStyle: false, allowBindToStyle: true },
      ],
      '@angular-eslint/template/no-duplicate-attributes': 'error',
      '@angular-eslint/template/button-has-type': 'error',
      '@angular-eslint/template/prefer-self-closing-tags': 'error',
      '@angular-eslint/template/prefer-contextual-for-variables': 'error',
      '@angular-eslint/template/prefer-at-empty': 'error',
      '@angular-eslint/template/prefer-at-else': 'error',
    },
  },
);
