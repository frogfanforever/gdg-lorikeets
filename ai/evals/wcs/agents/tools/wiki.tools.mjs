import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve, join } from "node:path";
import { tool } from "ai";
import { z } from "zod";

/**
 * Shared wiki access for the agentic runners — the qmd-backed search/read helpers AND the two
 * read-only AI SDK tools (search_wiki / read_wiki). Kept in one place so RagRunner, ToolAgentRunner,
 * and VerifyAgentRunner don't each re-implement qmd querying.
 *
 * Retrieval is the qmd CLI (`qmd query` — hybrid; BM25 alone is too sparse on this small corpus).
 */
const here = dirname(fileURLToPath(import.meta.url));
export const WIKI = resolve(here, "../../wiki");
export const QMD_INDEX = resolve(here, "../../.qmd/index.sqlite");
const EXCLUDE = new Set(["index"]); // wiki meta page, not guidance

/**
 * qmd hybrid search → ranked wiki page names. Parses each result's `qmd://wiki/<name>.md` line and
 * its following `Score: NN%` line. `minScore` drops low-relevance hits (adaptive threshold retrieval —
 * inject few docs when few are relevant, more when many are); `limit` caps how many qmd returns.
 * Default (`searchWiki(q)`) is backward compatible: top-8, no threshold, names only.
 */
export function searchWiki(query, { limit = 8, minScore = 0 } = {}) {
  const out = execFileSync("qmd", ["query", query, "-n", String(limit)], {
    encoding: "utf8",
    env: { ...process.env, INDEX_PATH: QMD_INDEX },
    maxBuffer: 16 * 1024 * 1024,
  });
  const hits = [];
  let cur = null;
  for (const line of out.split("\n")) {
    const m = line.match(/qmd:\/\/wiki\/([\w-]+)\.md/);
    if (m) { cur = m[1]; continue; }
    const s = line.match(/Score:\s*(\d+)%/);
    if (s && cur) {
      const name = cur;
      cur = null;
      if (!EXCLUDE.has(name) && !hits.some((h) => h.name === name)) {
        hits.push({ name, score: Number(s[1]) });
      }
    }
  }
  return hits.filter((h) => h.score >= minScore).map((h) => h.name);
}

/**
 * Read a wiki page's guidance body (frontmatter stripped).
 *   mode 'full'  (default) → the whole page. Backward compatible: readWikiPage(name) is unchanged.
 *   mode 'intro'           → just the FIRST-HEADER CHUNK (everything up to the first `## ` section).
 *     Each page's intro is authored to be a self-sufficient TL;DR — the essentials to build the
 *     capability correctly — so the agent can pull it when it only needs orientation and save the
 *     long-form detail (tables, every variant) for a `full` read. Pages with no `## ` return whole.
 */
export function readWikiPage(name, { mode = "full" } = {}) {
  const raw = readFileSync(join(WIKI, `${name}.md`), "utf8");
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/, "").trim();
  if (mode !== "intro") return body;
  const m = body.match(/\n##\s/); // first second-level heading = end of the intro chunk
  return m ? body.slice(0, m.index).trim() : body;
}

/** One-line frontmatter field (title/summary) from a wiki page, for the index. */
function frontmatterField(name, field) {
  const raw = readFileSync(join(WIKI, `${name}.md`), "utf8");
  const m = raw.match(new RegExp(`^${field}:\\s*(.+)$`, "im"));
  return m ? m[1].trim() : "";
}

/**
 * The injectable WIKI INDEX — the list of partials that EXIST, each with its one-line summary, built
 * live from the pages' frontmatter (always in sync with the corpus). The single-tool agent gets this
 * up front so it can pick docs to read BY NAME instead of blind-searching. Excludes the meta `index`.
 */
export function wikiIndex() {
  const names = readdirSync(WIKI)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""))
    .filter((n) => !EXCLUDE.has(n))
    .sort();
  return names
    .map((n) => `- \`${n}\` — ${frontmatterField(n, "summary") || frontmatterField(n, "title")}`)
    .join("\n");
}

// ─── Query builders ────────────────────────────────────────────────────────────────────────────────
// Turn a task prompt into a qmd query. `wholeTaskQuery` is noisy (feature prose + boilerplate);
// `technicalRequirementsQuery` narrows to the "## Technical Requirements" (+ "## UI Requirements")
// section, where the capability keywords live — the sharper query.
const cleanForQuery = (t) =>
  t.replace(/```[\s\S]*?```/g, " ").replace(/File name:[^\n]*/g, " ").replace(/https?:\/\/\S+/g, " ")
    .replace(/[#>`*_]/g, " ").replace(/\s+/g, " ").trim().slice(0, 600);

export const wholeTaskQuery = (taskPrompt) => cleanForQuery(taskPrompt);

/** Raw "## Technical Requirements" (+ "## UI Requirements") section text — UNtruncated. */
export function technicalRequirementsSection(taskPrompt) {
  const section = (h) => {
    const m = taskPrompt.match(new RegExp(`##\\s*${h}[\\s\\S]*?(?=\\n##\\s|$)`, "i"));
    return m ? m[0] : "";
  };
  return [section("Technical Requirements"), section("UI Requirements")].join(" ") || taskPrompt;
}

/** The tech-req section as a qmd query (cleaned + length-capped for the retriever). */
export const technicalRequirementsQuery = (taskPrompt) =>
  cleanForQuery(technicalRequirementsSection(taskPrompt));

// ─── Retrieval strategies ────────────────────────────────────────────────────────────────────────
// Each strategy: (taskPrompt) => wiki page names to inject. Add or tune a strategy HERE and it flows
// to BOTH consumers with no duplicated logic: scripts/eval-retrieval.mjs scores every strategy, and the
// RagRunner uses whichever is named DEFAULT_STRATEGY. Workflow: run the eval → pick the winner → set
// DEFAULT_STRATEGY below → the RagRunner reroutes automatically.

/** Universal partials every component task needs but no task NAMES → always injected by *+baseline. */
export const BASELINE_PARTIALS = ["components", "templates", "component-decorator"];
const dedupe = (a) => [...new Set(a)];

// Deterministic keyword → doc map. The task NAMES its capabilities (the "best-practices" bullets), so
// match them straight to docs — no semantic ranker. This is PRECISION-FIRST and VARIABLE size: inject
// only what the task names, so user-list (never says "form") stays small while edit-comment-form grows.
// Word-boundary regex so "Formatting" does NOT trip "form".
const KEYWORD_DOC = [
  [/\bproject\b/i, "project-setup"],
  [/\btypescript\b/i, "typescript"],
  [/\bcomponent decorator\b/i, "component-decorator"],
  [/\btemplate\b/i, "templates"],
  [/\bcomponent\b/i, "components"],
  [/\bstate management\b/i, "state-management"],
  [/\bmodel\b/i, "models"],
  [/\bservice\b/i, "services"],
  [/\bformatting\b/i, "formatting"],
  [/\bforms?\b/i, "forms"],
  [/\baccessib/i, "accessibility"],
];

/** Docs the task NAMES, matched deterministically (full section, no ranker). */
function keywordMatch(task) {
  const tr = technicalRequirementsSection(task); // FULL section, not the 600-char qmd query
  return dedupe(KEYWORD_DOC.filter(([re]) => re.test(tr)).map(([, doc]) => doc));
}

// Precision-first priority: keep the task-specific/discriminating docs first, universals next, the
// always-fine baseline (typescript, project-setup) last. `keyword-lean` keeps the top LEAN_CAP of
// these — trading a little recall for a leaner prompt (all kept docs are still relevant → ~100% precision).
const DOC_PRIORITY = ["forms", "services", "models", "formatting", "state-management",
  "components", "templates", "component-decorator", "typescript", "project-setup"];
const LEAN_CAP = 5; // tune: lower = leaner prompt + lower recall (the demo tradeoff knob)

// Docs the SLIM CORE (system-instructions.static.md) already compresses. Injecting the long-form wiki
// version re-pastes guidance the model already has → the RAG prompt pays for the baseline TWICE and
// ends up BIGGER than the monolithic few-shot prompt. RAG's real job is to add only the delta the core
// defers per task ("forms, service declaration, data-model shape"), so exclude these from injection.
const CORE_COVERED = new Set(["components", "templates", "state-management", "typescript",
  "formatting", "project-setup", "accessibility", "component-decorator"]);

export const RETRIEVAL_STRATEGIES = {
  "whole-task": (task) => searchWiki(wholeTaskQuery(task)).slice(0, 5),
  "tech-req": (task) => searchWiki(technicalRequirementsQuery(task)).slice(0, 5),
  "tech-req+baseline": (task) =>
    dedupe([...BASELINE_PARTIALS, ...searchWiki(technicalRequirementsQuery(task)).slice(0, 3)]),
  "tech-req+threshold": (task) =>
    searchWiki(technicalRequirementsQuery(task), { limit: 10, minScore: 40 }).slice(0, 7),
  // Precision-first, VARIABLE size: inject only the docs whose capability the task's Technical
  // Requirements actually name. No qmd, fully deterministic — user-list won't pull `forms`.
  // Deterministic, precision-first, VARIABLE size: inject exactly the docs the task names (no ranker).
  "keyword-match": (task) => keywordMatch(task),
  // DELTA-ONLY (the token-win strategy the RagRunner uses): inject only the docs the task names AND the
  // slim core does NOT already cover → RAG adds task-specific depth (models, services, forms) instead of
  // re-pasting the baseline. Fewest tokens, ~100% precision, and the honest RAG story on a small corpus.
  "keyword-delta": (task) => keywordMatch(task).filter((d) => !CORE_COVERED.has(d)),
  // Same keyword match, but capped by priority → leaner prompt at the cost of recall. The demo tradeoff:
  // LOW tokens, but it drops needed docs (e.g. component-decorator) → the generated code quality falls.
  "keyword-lean": (task) =>
    DOC_PRIORITY.filter((d) => keywordMatch(task).includes(d)).slice(0, LEAN_CAP),
};

/** The strategy the RagRunner uses. CHANGE THIS to the eval's winner to reroute stage 5. */
export const DEFAULT_STRATEGY = "keyword-delta";

/**
 * RagRunner's one-call entry point: run a strategy and return a ready-to-inject guidance block
 * (`{ names, block }`; block is "" if nothing retrieved or qmd is unavailable). The runner just splices
 * `block` into its system message — ALL query/strategy/formatting logic lives here, not in the runner.
 */
export function retrieveGuidance(taskPrompt, strategy = DEFAULT_STRATEGY) {
  // accept a strategy NAME ("tech-req+baseline") OR the strategy function itself
  const fn =
    typeof strategy === "function"
      ? strategy
      : RETRIEVAL_STRATEGIES[strategy] ?? RETRIEVAL_STRATEGIES[DEFAULT_STRATEGY];
  let names = [];
  try { names = fn(taskPrompt); } catch { names = []; } // qmd unavailable → inject nothing
  if (!names.length) return { names, block: "" };
  const guidance = names.map((n) => `<!-- wiki:${n} -->\n${readWikiPage(n)}`).join("\n\n---\n\n");
  return { names, block: `## Relevant Angular guidance for this task\n\n${guidance}` };
}

/**
 * The two read-only wiki tools shared by the agentic runners. Spread the result into a
 * ToolLoopAgent's `tools`. Pass `onRead(name, text)` to observe each page the agent reads — e.g.
 * ToolAgentRunner collects them to inject into its structured delivery phase.
 */
export function wikiTools({ onRead } = {}) {
  return {
    search_wiki: tool({
      description:
        "Semantic search over the curated Angular best-practices wiki. Returns ranked page names. " +
        "Call it for each capability the task involves (forms, state, templates, models, …).",
      inputSchema: z.object({
        query: z.string().describe("What you need guidance on, in natural language."),
      }),
      execute: async ({ query }) => {
        try {
          const pages = searchWiki(query);
          return pages.length
            ? `Relevant wiki pages (most relevant first): ${pages.join(", ")}.\nUse read_wiki([...]) to read the ones you need.`
            : "No matching wiki pages.";
        } catch (e) {
          return `Wiki search failed: ${e.message}`;
        }
      },
    }),
    read_wiki: tool({
      description:
        "Read the full guidance body for one or more wiki pages by name " +
        "(e.g. 'forms', 'component-decorator', 'state-management').",
      inputSchema: z.object({
        pages: z
          .array(z.string())
          .describe("Wiki page names to read, e.g. ['forms','components']."),
      }),
      execute: async ({ pages }) =>
        pages
          .map((name) => {
            try {
              const text = readWikiPage(name);
              onRead?.(name, text);
              return `<!-- wiki:${name} -->\n${text}`;
            } catch {
              return `<!-- wiki:${name} (not found) -->`;
            }
          })
          .join("\n\n---\n\n"),
    }),
  };
}

/**
 * Mode-aware, search-free read tool for the SINGLE-TOOL agent (stage 6b). No `search_wiki`: the agent
 * already has the full index in its system prompt (see wikiIndex), so it reads by NAME. Each read
 * picks a granularity — `intro` (the essentials TL;DR) or `full` (the whole partial) — so the agent
 * spends tokens only where a task needs the long-form detail. Spread into a ToolLoopAgent's `tools`.
 */
export function readWikiTool({ onRead } = {}) {
  return {
    read_wiki: tool({
      description:
        "Read curated Angular guidance partials by name (see the wiki index in your instructions). " +
        "mode 'intro' returns the essentials (enough to use the capability correctly); mode 'full' " +
        "returns the complete partial with every variant, table and edge case. Prefer 'intro'; use " +
        "'full' for the capability you are actually implementing.",
      inputSchema: z.object({
        pages: z.array(z.string()).describe("Wiki page names, e.g. ['forms','services']."),
        mode: z
          .enum(["intro", "full"])
          .default("intro")
          .describe("'intro' = essentials TL;DR (cheaper), 'full' = the whole partial."),
      }),
      execute: async ({ pages, mode = "intro" }) =>
        pages
          .map((name) => {
            try {
              const text = readWikiPage(name, { mode });
              onRead?.(name, mode, text);
              return `<!-- wiki:${name} (${mode}) -->\n${text}`;
            } catch {
              return `<!-- wiki:${name} (not found) -->`;
            }
          })
          .join("\n\n---\n\n"),
    }),
  };
}
