// Stage 2 — + YOUR CUSTOM BINARY RULES. The opinions the official linter doesn't (yet) hold.
import base from "./config.base.mjs";
import { angularEslintFullRating } from "./ratings/angular-eslint-full.rating.mjs";
import { inputOutputRating } from "./ratings/input-output.rating.mjs";
import { noMutateOnSignalsRating } from "./ratings/no-mutate-on-signals.rating.mjs";
import { pureStateTransformationsRating } from "./ratings/pure-state-transformations.rating.mjs";
import { reactiveRating } from "./ratings/reactive.rating.mjs";
import { noRouteSnapshotRating } from "./ratings/no-route-snapshot.rating.mjs";
import { formattingRating } from "./ratings/formatting.rating.mjs";

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  ...base,
  displayName: "Stage 2",
  generationSystemPrompt: "./system-instructions.s1.md",
  ratings: [
    angularEslintFullRating, // stage 1 (full standard: + standalone + change-detection)
    inputOutputRating, // input()/output() over @Input()/@Output()
    noMutateOnSignalsRating, // .update()/.set(), never .mutate()
    pureStateTransformationsRating, // no assignment inside computed()/update()
    reactiveRating, // toSignal / async pipe / take(1)
    noRouteSnapshotRating, // reactive paramMap, never route.snapshot
    formattingRating, // format via built-in pipes, not component methods
  ],
};
