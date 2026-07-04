/**
 * solver-agent — CLI runner.
 *
 * Flow: load config -> parse problem -> run agent (orchestrator + subagents)
 *       -> print delegation/tool log -> print structured solution.
 */
import { loadConfig } from './config';
import { loadFakeUserPrompt } from './prompts/loader';
import { runAgent, extractText } from './run';

function parseUserPrompt(argv: string[], fallback: string): string {
  const flagIndex = argv.findIndex((arg) => arg === '--problem');
  if (flagIndex !== -1 && argv[flagIndex + 1]) {
    return argv[flagIndex + 1];
  }
  return fallback;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const userPrompt = parseUserPrompt(process.argv.slice(2), loadFakeUserPrompt());

  console.log(`🧠 solver-agent starting (model: ${config.agentModel})`);
  console.log(`🔌 MCP server: ${config.mcpServerUrl}`);
  console.log('\n=== User prompt ===\n');
  console.log(userPrompt);
  console.log('\n⏳ Invoking agent...');

  const result = await runAgent(config, userPrompt);

  if (result.toolCalls.length > 0) {
    console.log(`\n🔧 Tool / delegation calls (${result.toolCalls.length}):`);
    for (const call of result.toolCalls) {
      console.log(`  - ${call.name}(${JSON.stringify(call.args)})`);
    }
  }

  console.log('\n=== Solution ===\n');

  if (!result.solution) {
    console.warn(
      `⚠️  Could not parse a structured TrizSolution: ${result.solutionError ?? 'unknown error'}`
    );
    const lastMessage = result.messages[result.messages.length - 1];
    console.log(extractText(lastMessage?.content));
    return;
  }

  const s = result.solution;

  console.log('Contradictions found:');
  for (const c of s.contradictions) {
    console.log(
      `  ✦ Improving [${c.improving_parameter.id}] ${c.improving_parameter.name}` +
        ` vs. Worsening [${c.worsening_parameter.id}] ${c.worsening_parameter.name}`
    );
    console.log(`    ${c.description}`);
  }

  console.log('\nProposed TRIZ principles:');
  for (const p of s.proposed_principles) {
    console.log(`  [${p.id}] ${p.name}`);
    console.log(`    ${p.application}`);
  }

  console.log('\nSummary:\n');
  console.log(s.summary);
}

main().catch((error) => {
  console.error(`\n❌ solver-agent failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
