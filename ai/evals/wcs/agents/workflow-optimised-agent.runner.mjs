import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_SCHEMA, MODEL_MAX_RETRIES, usageTracker } from "./core.mjs";
import { wikiTools, readWikiPage } from "./tools/wiki.tools.mjs";
import { lintProject, errorsOf, pagesForErrors } from "./tools/verify.tools.mjs";
import { ollamaGenerateFiles, FIXER_MODEL_ID } from "./models.mjs";

/**
 * WorkflowOptimisedAgentRunner — same shape as WorkflowAgentRunner (planner → writer → verify→fix loop),
 * but the FIX step is optimised: instead of one fixer call for all errors, we fix ONE RULE AT A TIME.
 *
 * Per round we group the verifier's errors by ruleId and run a fixer per rule, handing it:
 *   - every violation of THAT rule (all occurrences, across files), squeezed into one prompt, and
 *   - only the wiki page(s) for THAT rule, and only the file(s) that rule touches.
 *
 * Rationale: a fixer focused on a single convention makes concrete, predictable edits (no "fix six
 * unrelated things at once"). It costs more calls/output tokens — accepted on purpose. Rules are
 * fixed sequentially and the project Map is updated after each, so a later rule's fixer sees the
 * edits made by earlier ones.
 *
 * MULTI-MODEL: planner + writer run on the Gemini --model (paid); the output-heavy FIXER runs on a
 * LOCAL Ollama model (see models.mjs — gemma4 by default), so its tokens are $0 and not rate-limited.
 * usageTracker prices each call by its own model, so the cost banner shows Gemini billed + fixer free.
 */
const here = dirname(fileURLToPath(import.meta.url));
const PLANNER_MAX_STEPS = 12;
const MAX_FIX_ROUNDS = 3;

const BASE = "You are an expert Angular (v20+) and TypeScript engineer.";

const PLANNER_PROMPT = `${BASE}
You are the PLANNER. Identify every Angular capability this task involves — including the ones it
does NOT name out loud (every component has @Component decorator conventions; every data model has
declaration conventions). Use search_wiki / read_wiki to consult the curated best-practices wiki,
then output a CONCISE checklist (terse bullet points) of the SPECIFIC conventions the implementation
must follow for this task. Rules only — no code, no padding. This checklist is the ONLY thing handed
to the writer, so make it complete but tight.`;

const WRITER_PROMPT = `${BASE}
You are the WRITER. Implement the COMPLETE app the task asks for, following the conventions checklist
EXACTLY. Output every file (path + full content). The root component already exists: class \`App\`,
selector \`app-root\`, in src/app/app.ts (template src/app/app.html) — edit those; create your own
model/service files as the task needs; never touch main.ts.`;

const FIXER_PROMPT = `${BASE}
You are the FIXER, working on ONE convention at a time. You are given every violation of a SINGLE
rule, that rule's guidance, and the current content of the affected file(s). Fix ONLY that rule's
violations, without breaking the feature or other conventions. Output the COMPLETE corrected content
of every file you change.`;

export class WorkflowOptimisedAgentRunner extends AiSdkRunner {
  displayName = "WorkflowOptimisedAgentRunner";

  async generateFiles(options) {
    const task = options.context.executablePrompt;
    const modelOptions = await this.getAiSdkModelOptions(options);
    const trace = { plannerSteps: 0, briefChars: 0, rounds: [], agentCalls: 0 };
    const tok = usageTracker();

    // ── Agent 1: PLANNER — research the wiki, emit a concise conventions checklist (text only) ──
    const planner = new ToolLoopAgent({
      ...modelOptions,
      maxRetries: MODEL_MAX_RETRIES,
      stopWhen: stepCountIs(PLANNER_MAX_STEPS),
      tools: wikiTools(),
    });
    const planRes = await this._wrapRequestWithTimeoutAndRateLimiting(
      options,
      (abortSignal) =>
        planner.generate({
          messages: this.convertRequestToMessagesList({
            ...options,
            prompt: task,
            systemPrompt: PLANNER_PROMPT,
          }),
          abortSignal,
        }),
    );
    const brief = (planRes.text ?? "").trim();
    tok.add(planRes.totalUsage, options.model);
    trace.agentCalls++;
    trace.plannerSteps = (planRes.steps ?? []).length;
    trace.briefChars = brief.length;

    // ── Agent 2: WRITER — task + checklist → all files (structured output, no tools) ──
    const writer = await this.generateConstrained({
      ...options,
      systemPrompt: `${WRITER_PROMPT}\n\n## Conventions to follow for this task\n${brief}`,
      prompt: task,
      schema: FILES_SCHEMA,
    });
    tok.add(writer.usage, options.model);
    trace.agentCalls++;
    const project = new Map(
      (writer.output?.outputFiles ?? []).map((f) => [f.filePath, f.code]),
    );

    // ── Verify (free) → per-RULE fix loop. One fixer call per violated rule. ──
    for (let round = 1; round <= MAX_FIX_ROUNDS; round++) {
      const files = [...project].map(([filePath, code]) => ({ filePath, code }));
      const errors = errorsOf(lintProject(files));
      const roundLog = { round, errors: errors.length, rulesFixed: [] };
      trace.rounds.push(roundLog);
      if (errors.length === 0) break;

      // group all violations by rule — fix one rule (every occurrence) per focused call
      const byRule = new Map();
      for (const e of errors) {
        if (!byRule.has(e.ruleId)) byRule.set(e.ruleId, []);
        byRule.get(e.ruleId).push(e);
      }

      for (const [ruleId, ruleErrors] of byRule) {
        // current content of the files this rule touches (fresh — earlier rules may have edited them)
        const paths = [...new Set(ruleErrors.map((e) => e.filePath))];
        const affected = paths
          .map((p) => ({ filePath: p, code: project.get(p) }))
          .filter((f) => f.code != null);
        const pages = pagesForErrors(ruleErrors)
          .map((name) => {
            try {
              return `<!-- wiki:${name} -->\n${readWikiPage(name)}`;
            } catch {
              return "";
            }
          })
          .filter(Boolean);

        const violations = ruleErrors
          .map((e) => `  - ${e.filePath} (${e.line}:${e.column}): ${e.message}`)
          .join("\n");
        const fixerPrompt = [
          `Fix EVERY violation of the single rule \`${ruleId}\` listed below — and ONLY that rule.`,
          "Return the COMPLETE corrected content of each file you change, each under its EXACT",
          "original path (the path shown after ###). Do NOT rename files or invent new paths.",
          "",
          "## Violations of this rule",
          violations,
          "",
          "## Current content of the affected file(s)",
          ...affected.map((f) => `### ${f.filePath}\n\`\`\`\n${f.code}\n\`\`\``),
        ].join("\n");

        // The FIXER runs on a LOCAL Ollama model (gemma4) via its native structured-output API —
        // off the paid Gemini tier, $0/token. (The /v1 openai-compat path won't enforce the schema.)
        const fix = await this._wrapRequestWithTimeoutAndRateLimiting(
          options,
          (signal) =>
            ollamaGenerateFiles({
              system: `${FIXER_PROMPT}\n\n## Convention for ${ruleId}\n${pages.join("\n\n---\n\n")}`,
              user: fixerPrompt,
              signal,
            }),
        );
        tok.add(fix.usage, FIXER_MODEL_ID);
        trace.agentCalls++;
        roundLog.rulesFixed.push({ rule: ruleId, violations: ruleErrors.length });
        // Merge only into the files that actually had violations — a local model sometimes renames
        // the path. Accept matches; if it returned exactly one file for a single affected path,
        // remap that one (it clearly fixed "the file"); otherwise drop invented paths (no junk files).
        const affectedSet = new Set(paths);
        for (const f of fix.files) {
          if (affectedSet.has(f.filePath)) project.set(f.filePath, f.code);
        }
        if (
          fix.files.length === 1 &&
          paths.length === 1 &&
          !affectedSet.has(fix.files[0].filePath)
        ) {
          project.set(paths[0], fix.files[0].code);
        }
      }
    }

    const files = [...project].map(([filePath, code]) => ({ filePath, code }));
    const usage = tok.usage();

    // ── DIAGNOSTIC ── workflow shape + token spend + cost (compare to the non-optimised workflow).
    const costUsd = tok.log(this.displayName);
    try {
      mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
      writeFileSync(
        resolve(here, "../.run-debug/workflow-optimised.json"),
        JSON.stringify(
          { ...trace, finalFiles: files.map((f) => f.filePath), usage, costUsd },
          null,
          2,
        ),
      );
    } catch {}

    return { files, reasoning: "", usage };
  }
}
