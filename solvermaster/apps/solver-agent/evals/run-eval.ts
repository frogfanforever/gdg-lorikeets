/**
 * TRIZ solver-agent eval runner.
 *
 * Usage:
 *   npx ts-node evals/run-eval.ts                          # run all cases
 *   npx ts-node evals/run-eval.ts --case ewaste-recovery   # single case
 *   npx ts-node evals/run-eval.ts --report evals/report.json
 *   npx ts-node evals/run-eval.ts --gate                   # non-zero exit if any case fails
 *
 * Via Nx:
 *   npx nx eval solver-agent
 *   npx nx eval solver-agent -- --gate
 *
 * Requires MCP server running at MCP_SERVER_URL (default http://localhost:8123/mcp).
 */
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { loadConfig } from '../src/config';
import { preflightMcpServer } from '../src/tools/mcp-triz';
import { loadTrizMcpTools } from '../src/tools/mcp-triz';
import { runAgent } from '../src/run';
import { EVAL_CASES, EvalCase } from './dataset';
import { runChecks, CheckResult } from './checks';

interface CaseReport {
  id: string;
  problem: string;
  checks: CheckResult[];
  passed: number;
  total: number;
  ok: boolean;
  durationMs: number;
}

interface EvalReport {
  timestamp: string;
  model: string;
  mcpServerUrl: string;
  cases: CaseReport[];
  totalPassed: number;
  totalChecks: number;
  passRate: number;
}

function parseArgs(): {
  caseFilter?: string;
  reportPath?: string;
  gate: boolean;
  merge?: string;
} {
  const argv = process.argv.slice(2);
  const idx = (flag: string) => argv.findIndex((a) => a === flag);
  const val = (flag: string) => {
    const i = idx(flag);
    return i !== -1 ? argv[i + 1] : undefined;
  };
  return {
    caseFilter: val('--case'),
    reportPath: val('--report'),
    gate: argv.includes('--gate'),
    merge: val('--merge'),
  };
}

async function buildMatrixCaller(mcpServerUrl: string) {
  const { client, tools } = await loadTrizMcpTools(mcpServerUrl);
  const matrixTool = tools.find((t) => t.name === 'browse_contradiction_matrix');

  return {
    callMatrix: async (improving: number[], preserving: number[]): Promise<string> => {
      if (!matrixTool) throw new Error('browse_contradiction_matrix tool not found');
      const result = await matrixTool.invoke({
        improving_params: improving,
        preserving_params: preserving,
      });
      return typeof result === 'string' ? result : JSON.stringify(result);
    },
    close: () => client.close(),
  };
}

async function runCase(
  evalCase: EvalCase,
  callMatrix: (improving: number[], preserving: number[]) => Promise<string>
): Promise<CaseReport> {
  const config = loadConfig();
  const start = Date.now();

  console.log(`\n  Running case: ${evalCase.id}`);

  let agentResult;
  try {
    const prompt = evalCase.context
      ? `${evalCase.problem}\n\nKontekst: ${evalCase.context}`
      : evalCase.problem;
    agentResult = await runAgent(config, prompt);
  } catch (err) {
    const checks: CheckResult[] = [
      {
        name: 'output_valid',
        ok: false,
        detail: `runAgent threw: ${(err as Error).message}`,
      },
    ];
    return {
      id: evalCase.id,
      problem: evalCase.problem,
      checks,
      passed: 0,
      total: checks.length,
      ok: false,
      durationMs: Date.now() - start,
    };
  }

  const checks = await runChecks(evalCase, agentResult, callMatrix);
  const passed = checks.filter((c) => c.ok).length;

  for (const check of checks) {
    const icon = check.ok ? '✅' : '❌';
    console.log(`    ${icon} ${check.name}: ${check.detail}`);
  }

  return {
    id: evalCase.id,
    problem: evalCase.problem,
    checks,
    passed,
    total: checks.length,
    ok: passed === checks.length,
    durationMs: Date.now() - start,
  };
}

async function main(): Promise<void> {
  const args = parseArgs();
  const config = loadConfig();

  console.log(`🧪 solver-agent eval runner`);
  console.log(`   model:  ${config.agentModel}`);
  console.log(`   mcp:    ${config.mcpServerUrl}`);

  await preflightMcpServer(config.mcpServerUrl);
  console.log('   ✅ MCP server reachable\n');

  const cases = args.caseFilter
    ? EVAL_CASES.filter((c) => c.id === args.caseFilter)
    : EVAL_CASES;

  if (cases.length === 0) {
    console.error(`No cases found${args.caseFilter ? ` matching id="${args.caseFilter}"` : ''}`);
    process.exitCode = 1;
    return;
  }

  const matrixHelper = await buildMatrixCaller(config.mcpServerUrl);

  // Inter-case cooldown prevents Gemini RPM rate limits from causing empty
  // responses on cases that immediately follow heavy ones. Default 15 s.
  const INTER_CASE_DELAY_MS = parseInt(
    process.env.EVAL_INTER_CASE_DELAY_MS ?? '60000',
    10
  );

  const caseReports: CaseReport[] = [];
  for (let i = 0; i < cases.length; i++) {
    if (i > 0 && INTER_CASE_DELAY_MS > 0) {
      await new Promise((r) => setTimeout(r, INTER_CASE_DELAY_MS));
    }
    const report = await runCase(cases[i], matrixHelper.callMatrix);
    caseReports.push(report);
  }

  await matrixHelper.close();

  const totalChecks = caseReports.reduce((s, r) => s + r.total, 0);
  const totalPassed = caseReports.reduce((s, r) => s + r.passed, 0);
  const passRate = totalChecks > 0 ? Math.round((totalPassed / totalChecks) * 1000) / 1000 : 0;

  console.log('\n=== Eval summary ===');
  console.log(`Cases: ${caseReports.length}`);
  for (const r of caseReports) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} ${r.id}: ${r.passed}/${r.total} checks (${r.durationMs}ms)`);
  }
  console.log(`\nOverall: ${totalPassed}/${totalChecks} checks passed (pass rate: ${passRate})`);

  const report: EvalReport = {
    timestamp: new Date().toISOString(),
    model: config.agentModel,
    mcpServerUrl: config.mcpServerUrl,
    cases: caseReports,
    totalPassed,
    totalChecks,
    passRate,
  };

  const reportPath = args.reportPath ?? resolve(__dirname, 'report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\nReport written to ${reportPath}`);

  if (args.merge) {
    let scores: Record<string, unknown> = {};
    if (existsSync(args.merge)) {
      scores = JSON.parse(readFileSync(args.merge, 'utf-8'));
    }
    scores['agent.passRate'] = passRate;
    scores['agent.passed'] = totalPassed;
    scores['agent.total'] = totalChecks;
    writeFileSync(args.merge, JSON.stringify(scores, null, 2), 'utf-8');
    console.log(`Merged agent scores into ${args.merge}`);
  }

  if (args.gate && totalPassed < totalChecks) {
    console.error(`\nGATE FAILED: ${totalChecks - totalPassed}/${totalChecks} check(s) failed`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(`\n❌ eval runner failed: ${(err as Error).message}`);
  process.exitCode = 1;
});
