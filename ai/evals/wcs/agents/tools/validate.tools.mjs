import { createRequire } from "node:module";
import { join, dirname } from "node:path";
import { tool } from "ai";
import { z } from "zod";

/**
 * Stage-8 VALIDATION-gate tools — the "quality" gate the agent runs itself, on top of stage 7's
 * verify (lint) gate. Both read off a single live `ServeHarness` (one `ng serve --watch` booted for
 * the whole run): every write_file lands on disk and the dev server incrementally rebuilds, so these
 * tools are cheap reads, not per-call builds.
 *
 *   build()   — read the latest settled build status from the dev-server stream (compile errors).
 *   run_axe() — real axe-core audit against the already-served app (the graded a11y check).
 *
 * Gate ORDER matters and is enforced softly here + in the agentNote: a broken build makes the served
 * page a stale/error overlay, so run_axe refuses until build() is green.
 */
const require = createRequire(join(process.cwd(), "package.json"));
const WCS = dirname(require.resolve("web-codegen-scorer"));
const PUPPETEER_MOD = `${WCS}/workers/serve-testing/puppeteer.js`;

/**
 * Run a real axe-core audit against a served URL and return the raw violations array. Shared by the
 * run_axe TOOL (Stage 8, agent-driven) and the WorkflowAgentRunner's deterministic axe GATE (Stage 9,
 * code-driven) — same engine WCS scores with (runAppInPuppeteer → AxePuppeteer).
 */
export async function auditAxe(url) {
  const { runAppInPuppeteer } = await import(PUPPETEER_MOD);
  const res = await runAppInPuppeteer("axe-gate", url, false, true, () => {}, false, false);
  return res?.axeViolations ?? [];
}

export function validateTools(harness, { onAxe } = {}) {
  return {
    build: tool({
      description:
        "Report the live dev-server build result. The server rebuilds automatically on every " +
        "write_file, so this reads the latest compile status: green, or the TypeScript/template " +
        "errors to fix. Call after writing files and after verify() is clean; run_axe() is only " +
        "meaningful once this is green.",
      inputSchema: z.object({}),
      execute: async () => {
        const { ok, errors } = await harness.awaitBuild();
        return ok
          ? "✓ Build is GREEN — the app compiles. You can now run_axe()."
          : `✗ Build FAILED — fix these compile errors, write_file the fix, then build() again:\n${errors || "(compilation failed; see the failing file)"}`;
      },
    }),

    run_axe: tool({
      description:
        "Run a real axe-core accessibility audit against the running app — the exact a11y check the " +
        "app is graded on. Only meaningful once build() is green. Reports each violation; fix them " +
        "(write_file) and re-run until it reports 0.",
      inputSchema: z.object({}),
      execute: async () => {
        if (!harness.lastBuild.ok) {
          return "Build is not green yet — fix it with build() first. The served page is stale/errored, so an axe audit would be meaningless.";
        }
        let violations = [];
        try {
          violations = await auditAxe(harness.url);
        } catch (e) {
          return `axe audit could not run: ${e.message}`;
        }
        onAxe?.(violations);
        if (violations.length === 0) {
          return "✓ 0 accessibility violations — the axe gate passes at 100%.";
        }
        const lines = violations.map((v, i) => {
          const node = (v.nodes?.[0]?.html ?? "").slice(0, 120);
          return `  ${i + 1}. [${v.impact}] ${v.id}: ${v.description}\n     e.g. ${node}\n     → read_wiki(["accessibility"])`;
        });
        return (
          `${violations.length} accessibility violation(s) to fix before 100%:\n${lines.join("\n")}\n\n` +
          `Fix each in the template, write_file, then run_axe() again until it reports 0.`
        );
      },
    }),
  };
}
