// Stage 1 — OFF-THE-SHELF. Turn on the rules the Angular team already wrote (the FULL standard
// angular-eslint recommended set, incl. standalone + change-detection), and point the prompt at those
// SAME rules. You authored no eval and no novel rules — system-instructions.s1.md is just the baseline
// prompt + "follow the full angular-eslint recommended rules" — so the off-the-shelf score climbs to
// near-perfect. The lift is the cheapest first move: reuse what already exists.
//
// Later stages swap in the CURATED config (angular-best-practices.config.mjs) + tiered ratings, which
// deliberately turn standalone / change-detection OFF here and grade them as ranges instead.
import base from "./config.base.mjs";
import { angularEslintFullRating } from "./ratings/angular-eslint-full.rating.mjs";

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  ...base,
  displayName: "Stage 1",
  generationSystemPrompt: "./system-instructions.s1.md",
  ratings: [angularEslintFullRating],
};
