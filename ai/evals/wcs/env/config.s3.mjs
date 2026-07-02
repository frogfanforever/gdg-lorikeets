// Stage 3 — s2's rules + GRADED / TIERED "grey-zone" ratings (ranges, not 0/1). The test-vs-eval
// line: partial credit for "acceptable", zero for "wrong".
//
// NOTE the eslint swap: s3 uses the CURATED `angularEslintRating` (NOT s1/s2's full rating). The full
// rating grades standalone + change-detection as BINARY (prefer-standalone / prefer-on-push). Here the
// tiered `standaloneRating` / `changeDetectionRating` own those dimensions on a SCALE — using the full
// rating too would double-grade them and contradict the "omitting is best" scalar. Curated has both
// binary rules OFF, so the grey-zone ratings are the sole graders.
import base from "./config.base.mjs";
import { angularEslintRating } from "./ratings/angular-eslint.rating.mjs";
import { inputOutputRating } from "./ratings/input-output.rating.mjs";
import { noMutateOnSignalsRating } from "./ratings/no-mutate-on-signals.rating.mjs";
import { pureStateTransformationsRating } from "./ratings/pure-state-transformations.rating.mjs";
import { reactiveRating } from "./ratings/reactive.rating.mjs";
import { noRouteSnapshotRating } from "./ratings/no-route-snapshot.rating.mjs";
import { formattingRating } from "./ratings/formatting.rating.mjs";
import { changeDetectionRating } from "./ratings/change-detection.rating.mjs";
import { standaloneRating } from "./ratings/standalone.rating.mjs";
import { modelDeclarationKindRating } from "./ratings/model-declaration-kind.rating.mjs";
import { modelPurityRating } from "./ratings/model-purity.rating.mjs";

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  ...base,
  displayName: "Stage 3",
  generationSystemPrompt: "./system-instructions.s2.md",
  ratings: [
    // ── same as s2 (curated eslint baseline + custom binary rules; NO privacy) ──
    angularEslintRating,
    inputOutputRating,
    noMutateOnSignalsRating,
    pureStateTransformationsRating,
    reactiveRating,
    noRouteSnapshotRating,
    formattingRating,
    // ── + grey zones (scalar / partial credit) ──
    changeDetectionRating, // no key 100 > OnPush 75 > Default 0
    standaloneRating, // no key 100 > true 75 > false 0
    modelDeclarationKindRating, // type 100 > interface 75 > class 0
    modelPurityRating, // share of readonly, method-free props
  ],
};
