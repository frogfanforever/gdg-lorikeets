/**
 * UI component tools — the agent calls these to tell the frontend which screen
 * to show. Each call emits a `ui:show` socket directive (via RunContext) with
 * the current session snapshot, so the FE can navigate + render.
 */
import { tool } from '@langchain/core/tools';
import type { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { UiComponent } from './contract';
import { RunContext } from './run-context';

const payloadSchema = z.object({
  payload: z.any().optional().describe('optional structured data for this step'),
});

const generationSchema = z.object({
  principles: z
    .array(
      z.object({
        id: z.number().int().describe('TRIZ inventive principle id (1–40)'),
        name: z.string().describe('principle name'),
        description: z.string().optional().describe('short description / how it applies'),
      }),
    )
    .optional()
    .describe(
      'The inventive principles to display on the shortlist. Always pass them here — from the contradiction matrix if available, otherwise from your own TRIZ knowledge.',
    ),
  improving_id: z.number().int().optional().describe('improving parameter id (1–39), if known'),
  worsening_id: z.number().int().optional().describe('worsening parameter id (1–39), if known'),
});

function createShowTool(
  ctx: RunContext,
  name: string,
  component: UiComponent,
  description: string,
): DynamicStructuredTool {
  return tool(
    async ({ payload }) => {
      ctx.show(component, payload);
      return `Component "${component}" shown on the frontend.`;
    },
    { name, description, schema: payloadSchema },
  );
}

/**
 * The generation/shortlist screen is empty unless the session carries matrix
 * principles. The matrix lookup can come back empty (e.g. the TRIZ engine is
 * unavailable), so let the agent hand the principles it found straight to this
 * tool — we seed them into the session before emitting the frame, guaranteeing
 * the shortlist is never shown as "Brak zasad".
 */
function createGenerationTool(ctx: RunContext, description: string): DynamicStructuredTool {
  return tool(
    async ({ principles, improving_id, worsening_id }) => {
      if (!ctx.session.matrix?.principles?.length && principles?.length) {
        const improving = improving_id ?? ctx.session.parameters?.improving?.id ?? 0;
        const worsening = worsening_id ?? ctx.session.parameters?.preserving?.id ?? 0;
        ctx.setPrinciples(
          improving,
          worsening,
          principles.map((p) => ({ id: p.id, name: p.name, description: p.description })),
        );
      }
      ctx.show('generation');
      return 'Component "generation" shown on the frontend.';
    },
    { name: 'show_generation', description, schema: generationSchema },
  );
}

export function buildUiComponentTools(ctx: RunContext): DynamicStructuredTool[] {
  return [
    createShowTool(
      ctx,
      'show_problem_description',
      'problem-description',
      'Show the problem description screen. Call once at the very start, right after you receive the problem.',
    ),
    createShowTool(
      ctx,
      'show_contradiction',
      'contradiction',
      'Show the technical contradiction screen once the improving/worsening parameters are known.',
    ),
    createShowTool(
      ctx,
      'show_parameter_mapping',
      'parameter-mapping',
      'Show the TRIZ parameter-mapping screen once parameter candidates are available.',
    ),
    createGenerationTool(
      ctx,
      'Show the generation/shortlist screen once inventive principles are ready. Pass the principles (id + name, and a short description if you have one) in the `principles` field so the shortlist renders them.',
    ),
    createShowTool(
      ctx,
      'show_evaluation',
      'evaluation',
      'Show the evaluation/result screen once the final recommendation is ready.',
    ),
  ];
}
