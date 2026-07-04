/**
 * UI component tools — tell the frontend which screen to display.
 * Scaffold: each tool logs to console; real FE wiring is a follow-up.
 */
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';

const payloadSchema = z.object({ payload: z.any().optional() });

function createShowTool(
  name: string,
  component: string,
  description: string
): DynamicStructuredTool {
  return tool(
    async (input) => {
      // Tool I/O is logged by ConsoleProgressHandler in run.ts — no duplicate log here.
      return `Component "${component}" requested on frontend.`;
    },
    { name, description, schema: payloadSchema }
  );
}

const showProblemDescription = createShowTool(
  'show_problem_description',
  'problem-description',
  'Show the problem description component on the frontend when the user has submitted or you have received the initial problem text.'
);

const showContradiction = createShowTool(
  'show_contradiction',
  'contradiction',
  'Show the contradiction component on the frontend once the technical contradiction (AP / EP1 / EP2) is known.'
);

const showParameterMapping = createShowTool(
  'show_parameter_mapping',
  'parameter-mapping',
  'Show the parameter mapping component on the frontend once TRIZ parameter candidates are available.'
);

const showGeneration = createShowTool(
  'show_generation',
  'generation',
  'Show the generation component on the frontend once TRIZ principles and solution concepts are ready to present.'
);

const showEvaluation = createShowTool(
  'show_evaluation',
  'evaluation',
  'Show the evaluation component on the frontend once solution candidates are ready for blind scoring.'
);

export function buildUiComponentTools(): DynamicStructuredTool[] {
  return [
    showProblemDescription,
    showContradiction,
    showParameterMapping,
    showGeneration,
    showEvaluation,
  ];
}
