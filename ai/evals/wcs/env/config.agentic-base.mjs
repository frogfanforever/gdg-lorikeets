import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { LocalExecutor } from "web-codegen-scorer";
import base from "./config.base.mjs";

/**
 * Shared wiring for the AGENTIC stages (5–10). Each stage config calls
 * `agenticConfig({ displayName, runner, ratings })` — so both the generation STRATEGY (the runner)
 * AND the SCOREBOARD (the ratings) are stated EXPLICITLY in the stage config, not inherited invisibly.
 * Everything else is constant: the Angular framework, the entry tasks, and the shared slim-core prompt.
 *
 * The runner is wrapped in a real `LocalExecutor` so WCS's `instanceof LocalExecutor` check passes and
 * the `--runner` CLI flag is ignored (the executor owns the model). WCS forbids top-level local-executor
 * fields alongside `executor`, so `sourceDirectory` / `packageManager` are stripped off `base` and moved
 * into the LocalExecutor config.
 */
const here = dirname(fileURLToPath(import.meta.url));
const SOURCE_DIR = resolve(here, "./project");
const { sourceDirectory, packageManager, ...envBase } = base;

export function agenticConfig({ displayName, runner, ratings }) {
  return {
    ...envBase,
    displayName,
    generationSystemPrompt: "./system-instructions.static.md",
    ratings,
    executor: new LocalExecutor(
      { sourceDirectory: SOURCE_DIR, packageManager: packageManager ?? "npm" },
      runner,
    ),
  };
}
