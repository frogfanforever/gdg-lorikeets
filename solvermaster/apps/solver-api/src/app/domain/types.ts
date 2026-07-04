export interface Problem {
  title: string;
  statement: string;
  sdg?: string | null;
}

export interface Principle {
  id: number;
  name: string;
}

export interface Contradiction {
  method: string;
  improving: string;
  preserving: string;
  summary: string;
  /** Real TRIZ Inventive Principles (present for the pytriz-backed 'triz' method). */
  principles?: Principle[];
}

/** Persisted "Step Result Recorded" event. snake_case on purpose: identical wire
 *  shape to the Python service so the same be_eval dataset runs unchanged. */
export interface StepResult {
  id: string;
  run_id: string;
  step: string;
  method: string | null;
  inputs: unknown;
  output: unknown;
  model: string;
  params: Record<string, unknown>;
  tokens: number;
  cost: number;
  duration_ms: number;
  status: string;
  version: number;
  created_at: number;
}
