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

function truncate(text: string, max = 120): string {
  const oneLine = text.replace(/\s+/g, ' ').trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

async function main(): Promise<void> {
  const config = loadConfig();
  const userPrompt = parseUserPrompt(process.argv.slice(2), loadFakeUserPrompt());

  console.log(
    `solver-agent · ${config.agentModel} · ${config.mcpServerUrl}` +
      (config.verbose ? ' · verbose' : '')
  );
  console.log(`problem: ${truncate(userPrompt)}\n`);

  const result = await runAgent(config, userPrompt);

  if (result.toolCalls.length > 0) {
    const chain = result.toolCalls.map((c) => c.name).join(' → ');
    console.log(`\ntools (${result.toolCalls.length}): ${chain}`);
  }

  console.log('\n--- solution ---\n');

  if (!result.solution) {
    console.warn(
      `⚠️  Could not parse a structured TrizSolution: ${result.solutionError ?? 'unknown error'}`
    );
    if (!result.solution && result.messages.length <= 2 && result.toolCalls.length === 0) {
      console.warn(
        '💡 The agent returned an empty response. If this persists, set AGENT_MODEL=gemini-2.5-pro ' +
          'or AGENT_FALLBACK_MODEL=gemini-2.5-pro in apps/solver-agent/.env and rebuild.'
      );
    }
    const lastMessage = result.messages[result.messages.length - 1];
    console.log(extractText(lastMessage?.content));
    return;
  }

  const s = result.solution;

  for (const c of s.contradictions) {
    console.log(
      `✦ [${c.improving_parameter.id}] ${c.improving_parameter.name}` +
        ` vs [${c.worsening_parameter.id}] ${c.worsening_parameter.name}`
    );
    console.log(`  ${c.description}`);
  }

  console.log('\nprinciples:');
  for (const p of s.proposed_principles) {
    console.log(`  [${p.id}] ${p.name} — ${truncate(p.application, 200)}`);
  }

  console.log(`\n${s.summary}`);
}

main().catch((error) => {
  console.error(`\n❌ solver-agent failed: ${(error as Error).message}`);
  process.exitCode = 1;
});
