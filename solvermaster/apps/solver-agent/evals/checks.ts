/**
 * Deterministic per-case checks for the TRIZ solver agent.
 *
 * Each check returns { name, ok, detail } and is independent of the others.
 * principle_recall derives ground truth at runtime by calling the MCP server
 * directly — this keeps the dataset small (no hard-coded principle lists) and
 * self-verifying.
 */
import type { RunResult, ToolCallRecord } from '../src/run';
import type { EvalCase } from './dataset';
import type { TrizSolution } from '../src/schema';

export interface CheckResult {
  name: string;
  ok: boolean;
  detail: string;
}

// ---------------------------------------------------------------------------
// Individual checks
// ---------------------------------------------------------------------------

export function checkOutputValid(solution: TrizSolution | null, error?: string): CheckResult {
  return {
    name: 'output_valid',
    ok: solution !== null,
    detail: solution !== null ? 'TrizSolution parsed successfully' : (error ?? 'no solution'),
  };
}

export function checkConflictPresent(solution: TrizSolution | null): CheckResult {
  const ok = (solution?.contradictions?.length ?? 0) > 0;
  return {
    name: 'conflict_present',
    ok,
    detail: ok
      ? `${solution!.contradictions.length} contradiction(s) found`
      : 'no contradictions in output',
  };
}

export function checkParamIdsValid(solution: TrizSolution | null): CheckResult {
  if (!solution) return { name: 'param_ids_valid', ok: false, detail: 'no solution' };
  const invalid: number[] = [];
  for (const c of solution.contradictions) {
    for (const id of [c.improving_parameter.id, c.worsening_parameter.id]) {
      if (id < 1 || id > 39) invalid.push(id);
    }
  }
  return {
    name: 'param_ids_valid',
    ok: invalid.length === 0,
    detail: invalid.length === 0 ? 'all param IDs in 1–39' : `invalid param IDs: ${invalid.join(', ')}`,
  };
}

export function checkPrincipleIdsValid(solution: TrizSolution | null): CheckResult {
  if (!solution) return { name: 'principle_ids_valid', ok: false, detail: 'no solution' };
  const invalid = solution.proposed_principles
    .map((p) => p.id)
    .filter((id) => id < 1 || id > 40);
  return {
    name: 'principle_ids_valid',
    ok: invalid.length === 0,
    detail:
      invalid.length === 0
        ? 'all principle IDs in 1–40'
        : `invalid principle IDs: ${invalid.join(', ')}`,
  };
}

export function checkDelegationUsed(
  toolCalls: ToolCallRecord[],
  expectedSubagents: string[]
): CheckResult {
  if (expectedSubagents.length === 0) {
    return { name: 'delegation_used', ok: true, detail: 'no delegation requirement' };
  }
  const taskCalls = toolCalls
    .filter((tc) => tc.name === 'task')
    .map((tc) => {
      const args = tc.args as Record<string, unknown>;
      return (args['subagent_type'] ?? args['subagent'] ?? args['name'] ?? '') as string;
    });

  const missing = expectedSubagents.filter(
    (name) => !taskCalls.some((called) => called === name)
  );
  return {
    name: 'delegation_used',
    ok: missing.length === 0,
    detail:
      missing.length === 0
        ? `delegated to: ${[...new Set(taskCalls)].join(', ')}`
        : `missing delegations: ${missing.join(', ')}`,
  };
}

export function checkParamMatch(
  solution: TrizSolution | null,
  expectImproving?: number[],
  expectWorsening?: number[]
): CheckResult {
  if (!expectImproving && !expectWorsening) {
    return { name: 'param_match', ok: true, detail: 'no expected param IDs specified' };
  }
  if (!solution) return { name: 'param_match', ok: false, detail: 'no solution' };

  const agentImproving = new Set(
    solution.contradictions.map((c) => c.improving_parameter.id)
  );
  const agentWorsening = new Set(
    solution.contradictions.map((c) => c.worsening_parameter.id)
  );

  const improvingHit = expectImproving?.some((id) => agentImproving.has(id)) ?? true;
  const worseningHit = expectWorsening?.some((id) => agentWorsening.has(id)) ?? true;

  const ok = improvingHit && worseningHit;
  return {
    name: 'param_match',
    ok,
    detail: ok
      ? 'expected param IDs overlap agent output'
      : [
          !improvingHit
            ? `improving: expected one of [${expectImproving}], got [${[...agentImproving]}]`
            : '',
          !worseningHit
            ? `worsening: expected one of [${expectWorsening}], got [${[...agentWorsening]}]`
            : '',
        ]
          .filter(Boolean)
          .join('; '),
  };
}

/**
 * principle_recall — ground-truth derived at runtime.
 *
 * Calls browse_contradiction_matrix(expectedImproving, expectedWorsening) via the
 * MCP client to get the canonical principle set for this case, then checks
 * whether the agent's proposed_principles overlap it by at least one.
 *
 * If no expected params are provided, the check is skipped (ok: true).
 */
export async function checkPrincipleRecall(
  solution: TrizSolution | null,
  expectImproving: number[] | undefined,
  expectWorsening: number[] | undefined,
  callMatrix: (improving: number[], preserving: number[]) => Promise<string>
): Promise<CheckResult> {
  if (!expectImproving || !expectWorsening) {
    return {
      name: 'principle_recall',
      ok: true,
      detail: 'skipped (no expected param IDs for both sides)',
    };
  }
  if (!solution) {
    return { name: 'principle_recall', ok: false, detail: 'no solution to evaluate' };
  }

  let matrixText: string;
  try {
    matrixText = await callMatrix(expectImproving, expectWorsening);
  } catch (e) {
    return {
      name: 'principle_recall',
      ok: false,
      detail: `matrix call failed: ${(e as Error).message}`,
    };
  }

  // Extract principle IDs from the text returned by browse_contradiction_matrix.
  // Format: "... Principle Name (ID: 5) ..." or "ID: 5"
  const idMatches = [...matrixText.matchAll(/ID:\s*(\d+)/gi)];
  const canonicalIds = new Set(idMatches.map((m) => parseInt(m[1], 10)));

  if (canonicalIds.size === 0) {
    return {
      name: 'principle_recall',
      ok: true,
      detail: 'matrix returned no principles for expected params (cell may be empty)',
    };
  }

  const agentIds = new Set(solution.proposed_principles.map((p) => p.id));
  const overlap = [...canonicalIds].filter((id) => agentIds.has(id));

  return {
    name: 'principle_recall',
    ok: overlap.length > 0,
    detail:
      overlap.length > 0
        ? `overlap with canonical principles: [${overlap.join(', ')}]`
        : `no overlap; canonical=[${[...canonicalIds].join(', ')}], agent=[${[...agentIds].join(', ')}]`,
  };
}

// ---------------------------------------------------------------------------
// Aggregate runner
// ---------------------------------------------------------------------------

export async function runChecks(
  evalCase: EvalCase,
  result: RunResult,
  callMatrix: (improving: number[], preserving: number[]) => Promise<string>
): Promise<CheckResult[]> {
  const { solution, toolCalls, solutionError } = result;
  const { expect } = evalCase;

  const sync: CheckResult[] = [
    checkOutputValid(solution, solutionError),
    checkConflictPresent(solution),
    checkParamIdsValid(solution),
    checkPrincipleIdsValid(solution),
    checkDelegationUsed(toolCalls, expect.mustDelegate ?? ['parameter-mapper']),
    checkParamMatch(solution, expect.improvingParamIds, expect.worseningParamIds),
  ];

  const recall = await checkPrincipleRecall(
    solution,
    expect.improvingParamIds,
    expect.worseningParamIds,
    callMatrix
  );

  return [...sync, recall];
}
