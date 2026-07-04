/**
 * Loads prompt text from `.md` files co-located in `src/prompts`.
 *
 * webpack bundles every module into a single `main.js`, so `__dirname` at
 * runtime always resolves to the bundle's own directory (`dist/apps/solver-agent`)
 * rather than this file's original `src/prompts` location. `webpack.config.js`
 * copies the `.md` files next to the bundle under a `prompts/` folder to match.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

export function loadPrompt(fileName: string): string {
  // webpack bundle: __dirname = dist/apps/solver-agent, prompts copied to prompts/
  // ts-node source:  __dirname = src/prompts, files are directly here
  const candidates = [
    join(__dirname, 'prompts', fileName),
    join(__dirname, fileName),
  ];
  for (const filePath of candidates) {
    try {
      return readFileSync(filePath, 'utf-8').trim();
    } catch {
      // try next candidate
    }
  }
  throw new Error(
    `Failed to load prompt file "${fileName}". Tried: ${candidates.join(', ')}`
  );
}

export function loadSystemPrompt(): string {
  return loadPrompt('orchestrator.md');
}

export function loadFakeUserPrompt(): string {
  return loadPrompt('user_fake.md');
}

export interface SubagentPrompts {
  parameterMapper: string;
  principleFinder: string;
  solutionSynthesizer: string;
}

export function loadSubagentPrompts(): SubagentPrompts {
  return {
    parameterMapper: loadPrompt('parameter-mapper.md'),
    principleFinder: loadPrompt('principle-finder.md'),
    solutionSynthesizer: loadPrompt('solution-synthesizer.md'),
  };
}
