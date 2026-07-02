import { tool } from "ai";
import { z } from "zod";

/**
 * Shared file-delivery tools for tool-calling runners. All operate on a caller-owned `project` Map
 * (filePath → code): spread them into a ToolLoopAgent's `tools`, then read `project` back after
 * generate() for the final file list.
 *
 * write_file is ONE flat file per call on purpose — Gemini emits function calls as Python and mangles
 * a nested array-of-objects payload (MALFORMED_FUNCTION_CALL), so a two-string call is the reliable
 * way to deliver files. `finish` is the terminal signal — pair it with `stopWhen: hasToolCall("finish")`.
 */

/** Just the writer (for agents that end on their own stop condition, e.g. a verify loop). */
export function writeFileTool(project) {
  return {
    write_file: tool({
      description:
        "Create or overwrite ONE file with its COMPLETE content (e.g. src/app/app.ts). " +
        "Call once per file; re-call to replace a file.",
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

/** The terminal "I'm done" signal. Pair with `stopWhen: hasToolCall("finish")`. */
export function finishTool(project) {
  return {
    finish: tool({
      description:
        "Call this exactly ONCE, after every file is written, to end the task. Takes no arguments.",
      inputSchema: z.object({}),
      execute: async () => `Task complete — ${project.size} file(s) submitted.`,
    }),
  };
}

/** Convenience: write_file + finish together — the common one-liner for a write-then-finish agent. */
export function fileTools(project) {
  return { ...writeFileTool(project), ...finishTool(project) };
}
