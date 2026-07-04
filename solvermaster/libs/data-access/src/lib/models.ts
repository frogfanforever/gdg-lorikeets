export interface Problem { title?: string; statement: string; sdg?: string | null }
export interface Param { id: number; name: string; confidence?: number; alternatives?: Param[] }
export interface Principle { id: number; name: string; description?: string; rules?: string[]; hints?: string[]; examples?: string[] }

/** The technical contradiction, in the design's AP / EP1 / EP2 vocabulary. */
export interface Contradiction {
  method?: string;
  improving: string;   // EP1 — positive effect
  preserving: string;  // EP2 — negative effect
  summary: string;
  principles?: Principle[];
  action?: string;     // AP — the action
}

export interface SessionState {
  session_id: string;
  problem: Problem;
  analysis: { improving: Param; preserving: Param } | null;
  parameters: { improving: Param; preserving: Param } | null;
  matrix: { cell: { improving_id: number; preserving_id: number }; principles: Principle[] } | null;
  selected_principle_ids: number[] | null;
  recommendation: { text: string; applied_principle_ids: number[] } | null;
  decision_trace: string[];
  metadata: Record<string, unknown>;
}

/** Directive the agent pushes over the socket when it calls a `show_*` tool. */
export interface UiDirective {
  sessionId: string;
  component: string;
  route: string;
  step: number;
  session: SessionState;
  payload?: unknown;
}

export const STEPS = [
  { key: 'problem', label: 'Problem' },
  { key: 'methods', label: 'Metody' },
  { key: 'analysis', label: 'Analiza' },
  { key: 'shortlist', label: 'Shortlist' },
  { key: 'result', label: 'Wynik' },
] as const;
