// Stage 0 — BASELINE prompt, scored by the off-the-shelf eval (the "before").
// Same rating as stage 1 (angular-eslint), but pointed at the basic system instructions. Swapping to
// config.s1 (which adds "follow angular-eslint" to the prompt) shows the lift from one cheap line.
import { getBuiltInRatings } from "web-codegen-scorer";
import base from "./config.base.mjs";

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  ...base,
  displayName: "Stage 0",
  generationSystemPrompt: "./system-instructions.s0.md",
  ratings: [...getBuiltInRatings()],
};
