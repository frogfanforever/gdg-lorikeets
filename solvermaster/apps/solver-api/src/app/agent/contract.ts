/**
 * Socket contract between solver-api and the frontend.
 *
 * The agent drives the UI: every time it invokes a `show_*` tool the gateway
 * emits a `ui:show` directive telling the FE which component/route to render,
 * carrying an accumulated session snapshot so the page has data to show.
 */

export const SOCKET_EVENTS = {
  /** client -> server: start solving a problem (fire-and-forget). */
  solveStart: 'solve:start',
  /** server -> client: show a component / navigate to a route. */
  uiShow: 'ui:show',
  /** server -> client: the agent finished; final session attached. */
  solveDone: 'solve:done',
  /** server -> client: the agent failed. */
  solveError: 'solve:error',
} as const;

/** UI component keys — mirror the agent's `show_*` tools. */
export type UiComponent =
  | 'problem-description'
  | 'contradiction'
  | 'parameter-mapping'
  | 'generation'
  | 'evaluation';

/** Where each agent-driven component lives in the FE (route + stepper index). */
export const COMPONENT_ROUTES: Record<UiComponent, { route: string; step: number }> = {
  'problem-description': { route: '/problem', step: 0 },
  contradiction: { route: '/analysis', step: 2 },
  'parameter-mapping': { route: '/analysis', step: 2 },
  generation: { route: '/shortlist', step: 3 },
  evaluation: { route: '/result', step: 4 },
};

export interface Param {
  id: number;
  name: string;
  confidence?: number;
  alternatives?: Param[];
}

export interface Principle {
  id: number;
  name: string;
  description?: string;
}

/** Progressive snapshot the FE merges into its SessionStore as steps arrive. */
export interface SessionSnapshot {
  session_id: string;
  problem: { title?: string; statement: string };
  analysis: { improving: Param; preserving: Param } | null;
  parameters: { improving: Param; preserving: Param } | null;
  matrix: { cell: { improving_id: number; preserving_id: number }; principles: Principle[] } | null;
  selected_principle_ids: number[] | null;
  recommendation: { text: string; applied_principle_ids: number[] } | null;
  decision_trace: string[];
}

/** server -> client payload for `ui:show`. */
export interface UiDirective {
  sessionId: string;
  component: UiComponent;
  route: string;
  step: number;
  session: SessionSnapshot;
  /** raw payload the agent passed to the tool, if any. */
  payload?: unknown;
}

export interface SolveStartPayload {
  statement: string;
  title?: string;
  sessionId?: string;
}
