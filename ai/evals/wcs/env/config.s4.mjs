// Stage 4 — + OUT-OF-WEIGHTS capability. Signal Forms + the custom @Service decorator: telling failed,
// so the prompt now SHOWS each by example.
import base from "./config.base.mjs";
import { customRatings } from "./ratings/index.mjs";

/** @type {import("web-codegen-scorer").EnvironmentConfig} */
export default {
  ...base,
  displayName: "Stage 4",
  generationSystemPrompt: "./system-instructions.s3.md",
  ratings: [...customRatings],
};
