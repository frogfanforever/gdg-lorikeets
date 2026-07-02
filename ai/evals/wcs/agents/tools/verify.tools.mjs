import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { Linter } from "eslint";
import { WIKI } from "./wiki.tools.mjs";
import {
  angularBestPracticesConfig,
  reactiveConfig,
  formattingConfig,
  formStrategyConfig,
  noDecoratorIoConfig,
  componentDecoratorStrategyConfig,
  noMutateConfig,
  pureStateConfig,
  noGlobalsInTemplateConfig,
  modelDeclarationKindConfig,
  modelPurityConfig,
  noRouteSnapshotConfig,
  hashPrivateConfig,
  serviceDecoratorStrategyConfig,
} from "../../eslint-rules/index.mjs";

/**
 * Shared verifier — the lint machinery + the in-memory workspace tools (write_file / verify) that a
 * closed-loop runner gives its agent. Lints the agent's files with the SAME flat eslint configs the
 * WCS score uses, and maps each violation back to the wiki page that explains it.
 *
 * It checks CONVENTIONS only — not whether the task is actually complete (an empty/stub project
 * passes just as cleanly). That "verify ≠ done" warning lives in the system prompt
 * (system-instructions.verify-flow.md).
 */

// ── rule → wiki-page index (the remediation protocol) ────────────────────────
// Each wiki page's frontmatter lists the eslint `rules:` it explains. Invert that so a verify
// violation (ruleId) can point the agent straight at the page that teaches the fix.
function buildRuleToPages() {
  const map = {};
  for (const file of readdirSync(WIKI).filter((f) => f.endsWith(".md"))) {
    const name = file.replace(/\.md$/, "");
    const fm = readFileSync(join(WIKI, file), "utf8").match(/^---\n([\s\S]*?)\n---/);
    if (!fm) continue;
    const block = fm[1].match(/rules:\s*\n((?:[ \t]*-[ \t]*.+\n?)+)/);
    if (!block) continue;
    for (const line of block[1].split("\n")) {
      const m = line.match(/-\s*"?([^"\n]+?)"?\s*$/);
      if (m) (map[m[1].trim()] ||= []).push(name);
    }
  }
  return map;
}
const RULE_TO_PAGES = buildRuleToPages();

// ── lint — same flat configs the ratings use, run over in-memory files ───────
const CHECKS = [
  [angularBestPracticesConfig, /\.(ts|html)$/],
  [reactiveConfig, /\.ts$/],
  [formattingConfig, /\.ts$/],
  [formStrategyConfig, /\.html$/],
  [noDecoratorIoConfig, /\.ts$/],
  [componentDecoratorStrategyConfig, /\.ts$/],
  [noMutateConfig, /\.ts$/],
  [pureStateConfig, /\.ts$/],
  [noGlobalsInTemplateConfig, /\.html$/],
  [modelDeclarationKindConfig, /\.model\.ts$/],
  [modelPurityConfig, /\.model\.ts$/],
  [noRouteSnapshotConfig, /\.ts$/],
  [hashPrivateConfig, /\.ts$/], // score rewards `#private` → verify must flag the `private` keyword (NOT the inverse)
  [serviceDecoratorStrategyConfig, /\.ts$/], // tiered @Service>Injectable+root>… — the score rates it, so verify must too
];
const linter = new Linter({ configType: "flat" });

/** Run every check over [{filePath, code}] and return deduped findings. */
export function lintProject(files) {
  const findings = [];
  for (const [config, fileRe] of CHECKS) {
    for (const { filePath, code } of files.filter((f) => fileRe.test(f.filePath))) {
      for (const m of linter.verify(code, config, { filename: filePath })) {
        findings.push({ filePath, ruleId: m.ruleId, messageId: m.messageId, line: m.line, column: m.column, message: m.message });
      }
    }
  }
  const seen = new Set();
  return findings.filter((f) => {
    const k = `${f.filePath}:${f.line}:${f.column}:${f.ruleId}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// Tiered rules emit a message at EVERY tier — including the BEST one — so the scorer can grade it.
// A best-tier message (these messageIds score 1.0) is a "you did it right" confirmation, NOT an
// issue. Suppress them so the agent only ever sees ACTUAL errors and can drive the list to zero
// (= a full 100% on the graded checks). Penalty-rule violations have other messageIds → always errors.
const BEST_TIER = new Set([
  "signal", // form-strategy: signal forms
  "changeDetectionAbsent", // component-decorator-strategy: no changeDetection key
  "standaloneAbsent", // component-decorator-strategy: no standalone key
  "typeAlias", // model-declaration-kind: type alias
  "serviceDecorator", // service-decorator-strategy: the house @Service decorator (best tier)
]);

/** The real errors among findings — best-tier confirmations are not errors. */
export function errorsOf(findings) {
  return findings.filter((f) => !BEST_TIER.has(f.messageId));
}

/** Unique wiki page names that explain the given errors' rules — for targeted fixer context. */
export function pagesForErrors(errors) {
  const pages = new Set();
  for (const e of errors) for (const p of RULE_TO_PAGES[e.ruleId] || []) pages.add(p);
  return [...pages];
}

/**
 * The agent-facing report — ERRORS ONLY (best-tier confirmations suppressed), grouped by file so the
 * agent rewrites just the files that need it. Zero errors === the graded checks are saturated at 100%.
 */
export function formatVerify(files, findings) {
  const inventory = files.map((f) => f.filePath).join(", ") || "(none)";
  if (files.length === 0) {
    return "No files written yet — call write_file to create the app, then verify().";
  }
  const errors = errorsOf(findings);
  if (errors.length === 0) {
    return (
      `✓ 0 issues across ${files.length} file(s): ${inventory}. Every checked convention is at the ` +
      `top tier — a full 100% on the graded checks. If this is the COMPLETE feature the task asked ` +
      `for, you're done; otherwise finish the missing pieces and verify() again.`
    );
  }
  const byFile = new Map();
  for (const f of errors) {
    if (!byFile.has(f.filePath)) byFile.set(f.filePath, []);
    byFile.get(f.filePath).push(f);
  }
  const blocks = [...byFile].map(([file, fs]) => {
    const lines = fs.map((f) => {
      const page = (RULE_TO_PAGES[f.ruleId] || [])[0];
      const hint = page ? ` → read_wiki(["${page}"])` : "";
      return `    (${f.line}:${f.column}) [${f.ruleId ?? "parse-error"}]: ${f.message}${hint}`;
    });
    return `  ${file}:\n${lines.join("\n")}`;
  });
  return (
    `${errors.length} issue(s) to fix before 100% — fix these files: ${[...byFile.keys()].join(", ")}.\n` +
    `${blocks.join("\n")}\n\n` +
    `Correct each file, write_file it again, then verify() again. Repeat until 0 issues.`
  );
}

/**
 * The in-memory workspace tools: write_file (build) + verify (lint). Both operate on the SAME
 * `project` Map (filePath → code) the runner owns, so spread the result into a ToolLoopAgent's
 * `tools` and read `project` back after generate(). Pass `onVerify(errorCount, fileCount)` to
 * observe each verify pass (e.g. for diagnostics).
 *
 * write_file is a SINGLE flat file on purpose: Gemini emits function calls as Python and mangles a
 * nested array-of-objects payload (MALFORMED_FUNCTION_CALL), so write_files([{...}]) is out — a flat
 * two-string call serializes reliably (like the search/read tools).
 */
/** Just the write_file workspace tool (writes to the in-memory `project` Map). */
export function writeFileTool(project) {
  return {
    write_file: tool({
      description:
        "Create or overwrite ONE file in the project with its COMPLETE content. Call once per file " +
        "(e.g. src/app/app.ts, then src/app/app.html). Re-call it to fix a file after verify().",
      inputSchema: z.object({
        filePath: z.string().describe("Path, e.g. 'src/app/app.ts'."),
        code: z.string().describe("The full file content."),
      }),
      execute: async ({ filePath, code }) => {
        project.set(filePath, code);
        return `Saved ${filePath}. Project now has ${project.size} file(s): ${[...project.keys()].join(", ")}.`;
      },
    }),
  };
}

/** Just the verify (lint) tool — the code-style gate. Reusable on its own (e.g. Stage 8, which owns
 * a disk-writing write_file of its own). Pass `onVerify(errorCount, fileCount)` for diagnostics. */
export function verifyTool(project, { onVerify } = {}) {
  return {
    verify: tool({
      description:
        "Lint the current project with the exact rules the app is graded on, and report the " +
        "remaining ISSUES to fix (each linked to the wiki page that explains it). 0 issues means " +
        "every convention is at the top tier — a full 100%. Call after writing files; fix and " +
        "re-verify until it reports 0 issues.",
      inputSchema: z.object({}),
      execute: async () => {
        const files = [...project].map(([filePath, code]) => ({ filePath, code }));
        const findings = lintProject(files);
        onVerify?.(errorsOf(findings).length, files.length);
        return formatVerify(files, findings);
      },
    }),
  };
}

/**
 * The in-memory workspace tools: write_file (build) + verify (lint). Both operate on the SAME
 * `project` Map (filePath → code) the runner owns, so spread the result into a ToolLoopAgent's
 * `tools` and read `project` back after generate(). Pass `onVerify(errorCount, fileCount)` to
 * observe each verify pass (e.g. for diagnostics).
 *
 * write_file is a SINGLE flat file on purpose: Gemini emits function calls as Python and mangles a
 * nested array-of-objects payload (MALFORMED_FUNCTION_CALL), so write_files([{...}]) is out — a flat
 * two-string call serializes reliably (like the search/read tools).
 */
export function verifyTools(project, { onVerify } = {}) {
  return { ...writeFileTool(project), ...verifyTool(project, { onVerify }) };
}
