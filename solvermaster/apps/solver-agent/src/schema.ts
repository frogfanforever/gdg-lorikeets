/**
 * Zod schemas for structured outputs across all agent stages.
 *
 * Flat shapes only (no anyOf, no exclusiveMinimum/Maximum) to stay
 * compatible with Gemini's JSON-schema subset.
 */
import { z } from 'zod';

// ---- subagent responseFormats ------------------------------------------------

export const ContradictionMapping = z.object({
  contradictions: z.array(
    z.object({
      improving_parameter: z.object({ id: z.number(), name: z.string() }),
      worsening_parameter: z.object({ id: z.number(), name: z.string() }),
      rationale: z.string(),
    })
  ),
});
export type ContradictionMapping = z.infer<typeof ContradictionMapping>;

export const PrincipleCandidates = z.object({
  principles: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      note: z.string(),
    })
  ),
});
export type PrincipleCandidates = z.infer<typeof PrincipleCandidates>;

// ---- final orchestrator output -----------------------------------------------

export const TrizSolution = z.object({
  contradictions: z.array(
    z.object({
      improving_parameter: z.object({ id: z.number(), name: z.string() }),
      worsening_parameter: z.object({ id: z.number(), name: z.string() }),
      description: z.string(),
    })
  ),
  proposed_principles: z.array(
    z.object({
      id: z.number(),
      name: z.string(),
      application: z.string(),
    })
  ),
  summary: z.string(),
});
export type TrizSolution = z.infer<typeof TrizSolution>;

// ---- defensive text fallback -------------------------------------------------

export interface ParseResult {
  ok: boolean;
  value?: TrizSolution;
  error?: string;
}

/**
 * Extracts a TrizSolution from agent prose.
 *
 * Tries, in order:
 *  1. Last ```json … ``` fenced block in the text.
 *  2. The entire trimmed text as a raw JSON object (covers structured
 *     responseFormat payloads that deepagents injects as plain JSON into
 *     the ToolMessage without a code fence).
 */
export function parseSolution(text: string): ParseResult {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)];

  const candidates: string[] = blocks.length > 0
    ? [blocks[blocks.length - 1][1].trim()]
    : [];

  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    candidates.push(trimmed);
  }

  if (candidates.length === 0) {
    return { ok: false, error: 'no ```json block found in output' };
  }

  let lastError = 'no ```json block found in output';
  for (const raw of candidates) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      lastError = `JSON.parse failed: ${(e as Error).message}`;
      continue;
    }
    const result = TrizSolution.safeParse(parsed);
    if (result.success) return { ok: true, value: result.data };
    lastError = result.error.message;
  }
  return { ok: false, error: lastError };
}
