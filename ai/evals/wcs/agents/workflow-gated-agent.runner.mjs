import { mkdirSync, writeFileSync, appendFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { ToolLoopAgent, stepCountIs } from "ai";
import { AiSdkRunner } from "web-codegen-scorer";
import { FILES_SCHEMA, MODEL_MAX_RETRIES, usageTracker } from "./core.mjs";
import { wikiTools, readWikiPage } from "./tools/wiki.tools.mjs";
import { lintProject, errorsOf, pagesForErrors } from "./tools/verify.tools.mjs";
import { ServeHarness } from "./tools/serve.tools.mjs";
import { auditAxe } from "./tools/validate.tools.mjs";
import { ollamaGenerateFiles, FIXER_MODEL_ID } from "./models.mjs";

// Build errors are TS/Angular-API-shaped; map the error text to the wiki page(s) that explain that
// API, so the BUILD fixer gets the same targeted guidance the VERIFY fixer already gets per rule.
const BUILD_WIKI_HINTS = [
  [/@angular\/forms|formfield|formroot|\bform\(|signal forms/i, "forms"],
  [/@service\b|injectable|\binject\(|providedin/i, "services"],
  [/\bsignal\b|computed|tosignal|\beffect\(/i, "state-management"],
  [/\binput\(|\boutput\(|@component|changedetection|standalone/i, "components"],
  [/routeroutlet|activatedroute|\brouter\b/i, "templates"],
  [/\bmodel\b|readonly|type alias|interface/i, "models"],
];
const pagesForBuildError = (err = "") =>
  [...new Set(BUILD_WIKI_HINTS.filter(([re]) => re.test(err)).map(([, n]) => n))];

/**
 * WorkflowGatedAgentRunner — orchestration whose ONE job is 100% on the gates it measures.
 *
 * Two design commitments, both aimed squarely at correctness (not token savings):
 *
 * 1. FIX-UNTIL-GREEN, not a round budget. Stage 9 looped a fixed MAX_ROUNDS=6 across all gates and
 *    then RETURNED WHATEVER IT HAD — green or not. That's the same "quit at 98%" the single agent did,
 *    just relocated from the model's discretion into a hardcoded counter. Here each gate has its OWN
 *    inner loop that keeps fixing until that gate is clean. The only thing that stops a gate loop is
 *    NO-PROGRESS: if a fixer pass leaves the error signature unchanged, more identical passes won't
 *    help — we escalate the brief once (hand the fixer the WHOLE project + the wiki, not just the
 *    affected slice), and if that still doesn't move it, we stop hammering that gate and record it
 *    unresolved. So the loop is governed by convergence, with a generous MAX_TOTAL_FIXES only as a
 *    runaway backstop.
 *
 * 2. ISOLATED FIXER CONTEXT. Stage 9 kept ONE ever-growing engineer conversation (writer + every gate
 *    dump braided together); by round 4 the window is mostly stale file versions and raw lint output,
 *    and the fixer degrades exactly when it's on the hardest residual bugs. Here the WRITER runs once,
 *    isolated, and each FIXER is a FRESH call handed a TIGHT brief: the specific failing findings, the
 *    current content of just the affected file(s), the wiki page(s) for that rule, and a short
 *    "already tried" ledger. That ledger is the memory that stopped the old stateless fixer from
 *    thrashing — WITHOUT dragging the builder's whole history through every fix.
 *
 * Gates: VERIFY (lint conventions, free, in-memory) → BUILD (ng serve rebuild must be green) → AXE
 * (real axe-core against the live served app). Each is its own fix-until-green loop. A later fix can
 * reintroduce an earlier failure (a build fix can dirty lint; an a11y fix can break the build), so the
 * OUTER loop re-runs verify → build → axe until ALL are clean or nothing changes.
 *
 * SAME MODEL EVERYWHERE: planner, writer and fixer all run on the Gemini --model. The bonus stage
 * (config.s10) swaps ONLY the fixer onto a local Ollama gemma — usageTracker already prices per model,
 * so that swap shows up as free fixer tokens with zero other change.
 */
const here = dirname(fileURLToPath(import.meta.url));
const PLANNER_MAX_STEPS = 12;
const STALL_LIMIT = 2;       // consecutive no-progress fixer passes on a gate before we stop hammering it
const MAX_TOTAL_FIXES = 40;  // pure runaway backstop — the loop is really governed by no-progress
const MAX_OUTER = 8;         // safety ceiling on verify↔build cycles (build fix can dirty lint, and back)

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
You are the FIXER. You are handed ONE automated-check failure at a time, the current content of the
affected file(s), the guidance that explains the fix, and a note of what was already tried. Fix ONLY
what the failure reports, without breaking the feature or other conventions, and output the COMPLETE
corrected content of every file you change under its EXACT original path (never rename or invent
paths). Prior attempts that DID NOT clear this failure are listed — do something DIFFERENT.`;

export class WorkflowGatedAgentRunner extends AiSdkRunner {
  displayName = "WorkflowGatedAgentRunner";

  /**
   * @param {{ fixer?: "gemini" | "ollama" }} [opts]
   *   fixer: which model runs the FIX step. "gemini" (default, stage 9) uses the paid --model;
   *   "ollama" (stage 10) routes the output-heavy fixer to a LOCAL Gemma — $0/token, no rate limit —
   *   while planner + writer stay on Gemini. The ONLY difference between s9 and s10.
   */
  constructor({ fixer = "gemini" } = {}) {
    super();
    this.fixerBackend = fixer;
  }

  async generateFiles(options) {
    const task = options.context.executablePrompt;
    const modelOptions = await this.getAiSdkModelOptions(options);
    const trace = { plannerSteps: 0, briefChars: 0, fixerCalls: 0, verify: [], build: [], axe: [], unresolved: [], converged: false, fixes: [] };
    const tok = usageTracker();
    const harness = new ServeHarness();

    // Record every fix an agent makes (gate + what triggered it + the corrected code) into the trace
    // AND an append-only .run-debug/fixes.jsonl. This is the raw material for growing the wiki: read the
    // recurring triggers/messages across runs and distil them into "common errors → fix" wiki examples.
    const promptHead = String(task).replace(/\s+/g, " ").slice(0, 70);
    const logFix = (entry) => {
      const rec = { ...entry, task: promptHead };
      trace.fixes.push(rec);
      try {
        mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
        appendFileSync(resolve(here, "../.run-debug/fixes.jsonl"), JSON.stringify(rec) + "\n");
      } catch {}
    };

    // filePath → code. write() keeps the in-memory copy (verify lints THIS) and the served workdir
    // (build sees THIS) in lockstep, so both gates always judge the same bytes.
    const project = new Map();
    const write = (files) => {
      for (const f of files ?? []) {
        if (!f?.filePath) continue;
        project.set(f.filePath, f.code ?? "");
        harness.writeFile(f.filePath, f.code ?? "");
      }
    };
    const snapshot = () => [...project].map(([filePath, code]) => ({ filePath, code }));

    // One ISOLATED fixer call — fresh context every time, never the writer's history. Returns the
    // files it changed; caller decides how to merge them back into `project`.
    const useOllamaFixer = this.fixerBackend === "ollama";
    const fixer = async (system, user) => {
      if (trace.fixerCalls >= MAX_TOTAL_FIXES) return [];
      trace.fixerCalls++;
      // Stage 10: the fixer runs LOCAL on Ollama Gemma ($0, off the paid tier) via its native
      // structured-output API. Stage 9: the fixer runs on the paid Gemini --model. Everything else
      // (planner, writer, gates, fix-until-green) is identical.
      if (useOllamaFixer) {
        const res = await this._wrapRequestWithTimeoutAndRateLimiting(options, (signal) =>
          ollamaGenerateFiles({ system: `${FIXER_PROMPT}\n\n${system}`, user, signal }),
        );
        tok.add(res.usage, FIXER_MODEL_ID);
        return res.files ?? [];
      }
      const res = await this.generateConstrained({
        ...options,
        systemPrompt: `${FIXER_PROMPT}\n\n${system}`,
        prompt: user,
        schema: FILES_SCHEMA,
      });
      tok.add(res.usage, options.model);
      return res.output?.outputFiles ?? [];
    };

    try {
      // ── Agent 1: PLANNER — wiki → concise conventions checklist (text only) ──
      const planner = new ToolLoopAgent({
        ...modelOptions,
        maxRetries: MODEL_MAX_RETRIES,
        stopWhen: stepCountIs(PLANNER_MAX_STEPS),
        tools: wikiTools(),
      });
      const planRes = await this._wrapRequestWithTimeoutAndRateLimiting(options, (abortSignal) =>
        planner.generate({
          messages: this.convertRequestToMessagesList({ ...options, prompt: task, systemPrompt: PLANNER_PROMPT }),
          abortSignal,
        }),
      );
      const brief = (planRes.text ?? "").trim();
      tok.add(planRes.totalUsage, options.model);
      trace.plannerSteps = (planRes.steps ?? []).length;
      trace.briefChars = brief.length;

      // ── Agent 2: WRITER — task + checklist → all files (isolated, one shot) ──
      await harness.start(); // boot ng serve before the first build gate
      const writer = await this.generateConstrained({
        ...options,
        systemPrompt: `${WRITER_PROMPT}\n\n## Conventions to follow for this task\n${brief}`,
        prompt: task,
        schema: FILES_SCHEMA,
      });
      tok.add(writer.usage, options.model);
      write(writer.output?.outputFiles ?? []);

      // A rule that keeps failing across passes gets a growing "already tried" note (the memory that
      // stops thrashing) and, once STALL_LIMIT is hit, the wider-brief escalation.
      const attempts = new Map(); // signatureKey → count

      // ── GATE 1 — VERIFY: fix-until-green, ONE isolated fixer per violated rule. ──
      // Returns true if clean, false if it stalled (recorded unresolved).
      const runVerifyGate = async () => {
        let lastSig = null, stall = 0;
        while (trace.fixerCalls < MAX_TOTAL_FIXES) {
          const errors = errorsOf(lintProject(snapshot()));
          trace.verify.push({ errors: errors.length });
          if (errors.length === 0) return true;

          const sig = errors.map((e) => `${e.filePath}:${e.line}:${e.ruleId}`).sort().join("|");
          if (sig === lastSig) {
            if (++stall >= STALL_LIMIT) { trace.unresolved.push({ gate: "verify", errors: errors.length }); return false; }
          } else { stall = 0; }
          lastSig = sig;
          const escalate = stall > 0; // no movement last pass → widen the brief

          // group violations by rule; one focused fixer per rule (all occurrences), sequentially.
          const byRule = new Map();
          for (const e of errors) {
            if (!byRule.has(e.ruleId)) byRule.set(e.ruleId, []);
            byRule.get(e.ruleId).push(e);
          }

          for (const [ruleId, ruleErrors] of byRule) {
            const key = `verify:${ruleId}`;
            const tries = (attempts.get(key) ?? 0) + 1;
            attempts.set(key, tries);

            const paths = [...new Set(ruleErrors.map((e) => e.filePath))];
            // Normally show only the file(s) this rule touches; on escalation show the WHOLE project
            // (the fix may need a sibling file the rule didn't point at).
            const shown = escalate ? snapshot() : paths.map((p) => ({ filePath: p, code: project.get(p) })).filter((f) => f.code != null);
            const pageNames = pagesForErrors(ruleErrors);
            const pages = pageNames
              .map((n) => { try { return `<!-- wiki:${n} -->\n${readWikiPage(n)}`; } catch { return ""; } })
              .filter(Boolean);
            const violations = ruleErrors.map((e) => `  - ${e.filePath} (${e.line}:${e.column}): ${e.message}`).join("\n");
            const ledger = tries > 1
              ? `\n## Already tried (attempt ${tries} for this rule)\nPrevious fixes did NOT clear \`${ruleId}\`. Re-read the guidance and take a DIFFERENT approach.`
              : "";

            const changed = await fixer(
              `## Convention for ${ruleId}\n${pages.join("\n\n---\n\n")}`,
              [
                `Fix EVERY violation of the single rule \`${ruleId}\` below — and ONLY that rule.`,
                "Return the COMPLETE corrected content of each file you change, under its EXACT original path.",
                ledger,
                "",
                "## Violations of this rule",
                violations,
                "",
                "## Current content of the affected file(s)",
                ...shown.map((f) => `### ${f.filePath}\n\`\`\`\n${f.code}\n\`\`\``),
              ].join("\n"),
            );

            // Conservative merge: accept edits to the files this rule actually touched; if the fixer
            // returned exactly one file for a single affected path, remap it (it clearly fixed "the
            // file"); drop any other invented paths so we never write junk files.
            const affected = new Set(paths);
            const kept = changed.filter((f) => affected.has(f.filePath));
            const applied = kept.length ? kept
              : (changed.length === 1 && paths.length === 1) ? [{ filePath: paths[0], code: changed[0].code }] : [];
            if (applied.length) write(applied);
            logFix({
              gate: "verify",
              trigger: ruleId,
              attempt: tries,
              messages: [...new Set(ruleErrors.map((e) => e.message))].slice(0, 5),
              wikiPages: pageNames,
              changed: applied.map((f) => ({ path: f.filePath, after: (f.code ?? "").slice(0, 900) })),
            });
          }
        }
        trace.unresolved.push({ gate: "verify", reason: "fix-budget" });
        return false;
      };

      // ── GATE 2 — BUILD: fix-until-green, one isolated fixer per failing build. ──
      const runBuildGate = async () => {
        let lastSig = null, stall = 0;
        while (trace.fixerCalls < MAX_TOTAL_FIXES) {
          const build = await harness.awaitBuild();
          trace.build.push({ ok: build.ok });
          if (build.ok) return true;

          const sig = (build.errors || "").replace(/\s+/g, " ").slice(0, 500);
          if (sig === lastSig) {
            if (++stall >= STALL_LIMIT) { trace.unresolved.push({ gate: "build" }); return false; }
          } else { stall = 0; }
          lastSig = sig;
          const tries = (attempts.get("build") ?? 0) + 1;
          attempts.set("build", tries);
          const ledger = tries > 1
            ? `\n## Already tried (attempt ${tries})\nPrevious fixes did NOT make it compile. Re-read the errors carefully and take a DIFFERENT approach.`
            : "";

          // Give the build fixer the wiki page(s) for whatever API the error touches — same targeted
          // guidance the verify fixer gets per rule (an API-shaped compile error usually means the
          // convention for that API was missed).
          const wikiNames = pagesForBuildError(build.errors || "");
          const wikiBlock = wikiNames
            .map((n) => { try { return `<!-- wiki:${n} -->\n${readWikiPage(n)}`; } catch { return ""; } })
            .filter(Boolean)
            .join("\n\n---\n\n");

          // Build errors cross files (a bad import breaks another file), so the build fixer sees the
          // WHOLE project — this is the correctness-critical gate; we spend the tokens on purpose.
          const changed = await fixer(
            [
              "The app does not compile. Fix these TypeScript/Angular compile errors.",
              wikiBlock ? `\n## Relevant Angular guidance\n${wikiBlock}` : "",
            ].join("\n"),
            [
              "Make the app COMPILE (`ng build`). Fix the errors below without breaking the feature.",
              "Return the COMPLETE corrected content of every file you change, under its EXACT original path.",
              ledger,
              "",
              "## Build errors",
              build.errors || "(compilation failed)",
              "",
              "## Current project",
              ...snapshot().map((f) => `### ${f.filePath}\n\`\`\`\n${f.code}\n\`\`\``),
            ].join("\n"),
          );
          if (changed.length) write(changed); // build gate may legitimately ADD a missing file
          logFix({
            gate: "build",
            trigger: "build",
            attempt: tries,
            messages: (build.errors || "")
              .split("\n").filter((l) => /✘|error|TS\d{3,}|NG\d+/i.test(l)).slice(0, 8),
            wikiPages: wikiNames,
            changed: changed.map((f) => ({ path: f.filePath, after: (f.code ?? "").slice(0, 900) })),
          });
        }
        trace.unresolved.push({ gate: "build", reason: "fix-budget" });
        return false;
      };

      // ── GATE 3 — AXE (a11y): fix-until-green against the LIVE served app (real axe-core). Only
      // meaningful once the build is green — a broken page audits as garbage — so the outer loop calls
      // this only after BUILD passes, and we bail back if a fix regresses the build. ──
      const a11yGuidance = (() => { try { return readWikiPage("accessibility"); } catch { return ""; } })();
      const runAxeGate = async () => {
        let lastSig = null, stall = 0;
        while (trace.fixerCalls < MAX_TOTAL_FIXES) {
          if (!harness.lastBuild.ok) return false; // a fix broke the build — let the outer loop rebuild first
          let violations = [];
          try { violations = await auditAxe(harness.url); } catch { violations = []; }
          trace.axe.push({ violations: violations.length });
          if (violations.length === 0) return true;

          const sig = violations.map((v) => `${v.id}:${(v.nodes?.[0]?.html ?? "").slice(0, 80)}`).sort().join("|");
          if (sig === lastSig) {
            if (++stall >= STALL_LIMIT) { trace.unresolved.push({ gate: "axe", violations: violations.length }); return false; }
          } else { stall = 0; }
          lastSig = sig;
          const tries = (attempts.get("axe") ?? 0) + 1;
          attempts.set("axe", tries);
          const ledger = tries > 1
            ? `\n## Already tried (attempt ${tries})\nPrevious fixes did NOT clear these axe violations. Take a DIFFERENT approach.`
            : "";
          const list = violations
            .map((v, i) => `  ${i + 1}. [${v.impact}] ${v.id}: ${v.description}\n     e.g. ${(v.nodes?.[0]?.html ?? "").slice(0, 120)}`)
            .join("\n");

          // a11y fixes live in templates but can touch .ts (aria bindings), so the axe fixer sees the
          // WHOLE project — same spend-the-tokens stance as the build gate.
          const changed = await fixer(
            `## Accessibility guidance\n${a11yGuidance}`,
            [
              "Fix EVERY accessibility violation below — e.g. wrap the page content in a <main> landmark,",
              "give the page an <h1>, and label every control — without breaking the feature.",
              "Return the COMPLETE corrected content of every file you change, under its EXACT original path.",
              ledger,
              "",
              "## axe-core violations",
              list,
              "",
              "## Current project",
              ...snapshot().map((f) => `### ${f.filePath}\n\`\`\`\n${f.code}\n\`\`\``),
            ].join("\n"),
          );
          if (changed.length) write(changed);
          logFix({
            gate: "axe",
            trigger: "axe",
            attempt: tries,
            messages: violations.map((v) => `${v.id}: ${v.description}`).slice(0, 8),
            wikiPages: a11yGuidance ? ["accessibility"] : [],
            changed: changed.map((f) => ({ path: f.filePath, after: (f.code ?? "").slice(0, 900) })),
          });
          await harness.awaitBuild(); // let the dev server rebuild so the next audit hits fresh output
        }
        trace.unresolved.push({ gate: "axe", reason: "fix-budget" });
        return false;
      };

      // ── OUTER loop: drive ALL THREE gates green. A later fix can reintroduce an earlier failure (a
      // build fix can dirty lint; an a11y fix can break the build), so re-run verify → build → axe
      // until a full pass changes nothing. ──
      for (let outer = 1; outer <= MAX_OUTER; outer++) {
        const before = snapshot().map((f) => f.code).join("\n§\n");
        const verifyOk = await runVerifyGate();
        const buildOk = await runBuildGate();
        const axeOk = buildOk ? await runAxeGate() : false; // axe only meaningful on a green build
        if (verifyOk && buildOk && axeOk) { trace.converged = true; break; }
        // No file changed this whole pass → no gate can make progress; stop (unresolved stands).
        if (snapshot().map((f) => f.code).join("\n§\n") === before) break;
      }

      const files = snapshot();
      const usage = tok.usage();
      const costUsd = tok.log(this.displayName);
      try {
        mkdirSync(resolve(here, "../.run-debug"), { recursive: true });
        writeFileSync(
          resolve(here, "../.run-debug/workflow-gated.json"),
          JSON.stringify({ ...trace, finalFiles: files.map((f) => f.filePath), usage, costUsd }, null, 2),
        );
      } catch {}

      return { files, reasoning: "", usage };
    } finally {
      await harness.dispose();
    }
  }
}
