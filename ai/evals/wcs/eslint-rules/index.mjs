import tseslint from "typescript-eslint";
import angular from "angular-eslint";

import { formStrategyRule } from "./forms/form-strategy.rule.mjs";
import { requireSubscriptionTeardownRule } from "./reactive/require-subscription-teardown.rule.mjs";
import { preferToSignalRule } from "./reactive/prefer-to-signal.rule.mjs";
import { preferBuiltInPipeRule } from "./components/prefer-built-in-pipe.rule.mjs";
import { noDecoratorInputsOutputsRule } from "./components/no-decorator-inputs-outputs.rule.mjs";
import { componentDecoratorStrategyRule } from "./components/component-decorator-strategy.rule.mjs";
import { noMutateOnSignalsRule } from "./state/no-mutate-on-signals.rule.mjs";
import { pureStateTransformationsRule } from "./state/pure-state-transformations.rule.mjs";
import { noGlobalsInTemplateRule } from "./templates/no-globals-in-template.rule.mjs";
import { modelDeclarationKindRule } from "./models/model-declaration-kind.rule.mjs";
import { modelPurityRule } from "./models/model-purity.rule.mjs";
import { noActivatedRouteSnapshotRule } from "./routing/no-activated-route-snapshot.rule.mjs";
import { hashPrivateRule } from "./typescript/hash-private.rule.mjs";
import { noHashPrivateRule } from "./typescript/no-hash-private.rule.mjs";
import { serviceDecoratorStrategyRule } from "./services/service-decorator-strategy.rule.mjs";
import { angularBestPracticesConfig } from "./angular-best-practices.config.mjs";
import { angularEslintFullConfig } from "./angular-eslint-full.config.mjs";

/**
 * The workshop's custom ESLint rules, assembled as a real flat-config plugin.
 *
 * This is the DETECTION half ("what the code does"). The SCORING half ("how we grade it")
 * lives in env/ratings/, which import the flat-config fragments below, run them with
 * eslint's synchronous `Linter`, and turn the findings into a 0–1 coefficient. The only
 * coupling between the two halves is rule id / messageId → score.
 *
 * The rules use only AST (no type info), so they run on in-memory file content — no
 * tsconfig, no disk, no fork of angular-eslint.
 */
export const wcsAngularPlugin = {
  meta: { name: "eslint-plugin-wcs-angular", version: "1.0.0" },
  rules: {
    "form-strategy": formStrategyRule,
    "require-subscription-teardown": requireSubscriptionTeardownRule,
    "prefer-to-signal": preferToSignalRule,
    "prefer-built-in-pipe": preferBuiltInPipeRule,
    "no-decorator-inputs-outputs": noDecoratorInputsOutputsRule,
    "component-decorator-strategy": componentDecoratorStrategyRule,
    "no-mutate-on-signals": noMutateOnSignalsRule,
    "pure-state-transformations": pureStateTransformationsRule,
    "no-globals-in-template": noGlobalsInTemplateRule,
    "model-declaration-kind": modelDeclarationKindRule,
    "model-purity": modelPurityRule,
    "no-activated-route-snapshot": noActivatedRouteSnapshotRule,
    "hash-private": hashPrivateRule,
    "no-hash-private": noHashPrivateRule,
    "service-decorator-strategy": serviceDecoratorStrategyRule,
  },
};

const TS_LANGUAGE_OPTIONS = {
  parser: tseslint.parser,
  ecmaVersion: "latest",
  sourceType: "module",
};

// ── Ready flat-config fragments (hand straight to Linter.verify) ──────────────

/** Reactive/RxJS checks — runs over generated `.ts`. */
export const reactiveConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: {
      // toSignal() is the standard. `prefer-to-signal` now fires ONLY when a stream's values are
      // piped into a signal by hand (subscribe + set-from-param) — a one-shot `.set()` of a constant
      // on completion is idiomatic and left alone. `require-subscription-teardown` catches real leaks.
      "wcs/require-subscription-teardown": "error",
      "wcs/prefer-to-signal": "warn",
    },
  },
];

/** Manual-formatting-that-should-be-a-pipe checks — runs over generated `.ts`. */
export const formattingConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/prefer-built-in-pipe": "warn" },
  },
];

/** Form-strategy classifier — runs over generated `.html` (Angular template AST). */
export const formStrategyConfig = [
  {
    files: ["**/*.html"],
    languageOptions: { parser: angular.templateParser },
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/form-strategy": "warn" },
  },
];

/** No `@Input()`/`@Output()`/`@ViewChild()` decorators — use the signal functions. (TS) */
export const noDecoratorIoConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/no-decorator-inputs-outputs": "warn" },
  },
];

/**
 * @Component change-detection + standalone tier classifier — runs over generated `.ts`.
 * Emits both cd* and standalone* tier messageIds; the two ratings each filter their own.
 */
export const componentDecoratorStrategyConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/component-decorator-strategy": "warn" },
  },
];

/** No `.mutate()` on signals. (TS) */
export const noMutateConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/no-mutate-on-signals": "error" },
  },
];

/** Pure computed()/update() callbacks — no this.<x> = ... assignments. (TS) */
export const pureStateConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/pure-state-transformations": "warn" },
  },
];

/** No JS globals (Date/Math/window/document/…) in template expressions. (HTML) */
export const noGlobalsInTemplateConfig = [
  {
    files: ["**/*.html"],
    languageOptions: { parser: angular.templateParser },
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/no-globals-in-template": "warn" },
  },
];

/** Data-model declaration kind — type alias > interface > class. (`*.model.ts` only) */
export const modelDeclarationKindConfig = [
  {
    files: ["**/*.model.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/model-declaration-kind": "warn" },
  },
];

/** Model purity — properties readonly, no methods/getters/setters. (`*.model.ts` only) */
export const modelPurityConfig = [
  {
    files: ["**/*.model.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/model-purity": "error" },
  },
];

/** No `ActivatedRoute.snapshot` — use the reactive paramMap/params. (TS) */
export const noRouteSnapshotConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/no-activated-route-snapshot": "error" },
  },
];

/** Class member visibility: use ECMAScript `#` private members, never the `private` keyword. (TS) — LATER stage */
export const hashPrivateConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/hash-private": "error" },
  },
];

/** Class member visibility: use the `private` keyword, never ECMAScript `#` private members. (TS) — EARLY stages */
export const noHashPrivateConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/no-hash-private": "error" },
  },
];

/**
 * Service declaration tier classifier — runs over generated `.ts`. Tags each service decorator:
 * @Service (best) > @Injectable+root > @Injectable+scoped > @Injectable+empty. (TS)
 */
export const serviceDecoratorStrategyConfig = [
  {
    files: ["**/*.ts"],
    languageOptions: TS_LANGUAGE_OPTIONS,
    plugins: { wcs: wcsAngularPlugin },
    rules: { "wcs/service-decorator-strategy": "warn" },
  },
];

/** Curated upstream angular-eslint best practices, for LATER stages (TS + templates). */
export { angularBestPracticesConfig };

/** Full STANDARD angular-eslint recommended set (+ standalone / change-detection), for Stage 1. */
export { angularEslintFullConfig };
