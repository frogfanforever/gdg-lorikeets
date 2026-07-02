// Base environment — the fields every stage and runner share. Each config spreads this and
// overrides only what differs: `ratings`, `displayName`, `generationSystemPrompt` (and `executor`
// for the agentic runner). Relative paths resolve against this file's directory (env/), which is
// the same directory every config lives in — so spreading the strings keeps them valid.
/** @type {Partial<import("web-codegen-scorer").EnvironmentConfig>} */
export default {
  clientSideFramework: "angular",
  sourceDirectory: "./project",
  packageManager: "npm",
  executablePrompts: ["../tasks/*.md"],
};
