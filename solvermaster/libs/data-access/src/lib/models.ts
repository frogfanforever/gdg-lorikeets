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

export const STEPS = [
  { key: 'contradiction', label: 'Sprzeczność' },
  { key: 'mapping', label: 'Mapowanie' },
  { key: 'generation', label: 'Generowanie' },
  { key: 'evaluation', label: 'Ocena' },
  { key: 'choice', label: 'Wybór' },
] as const;
