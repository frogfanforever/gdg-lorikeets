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

/** Canonical names of the 40 TRIZ inventive principles — used as a guaranteed
 *  fallback so a principle never renders as a bare "Zasada {id}". */
export const TRIZ_PRINCIPLE_NAMES: Record<number, string> = {
  1: 'Segmentacja',
  2: 'Wydzielenie',
  3: 'Lokalna jakość',
  4: 'Asymetria',
  5: 'Łączenie',
  6: 'Uniwersalność',
  7: 'Zagnieżdżanie',
  8: 'Przeciwwaga',
  9: 'Wstępne przeciwdziałanie',
  10: 'Działanie wyprzedzające',
  11: 'Wcześniejsze zabezpieczenie',
  12: 'Ekwipotencjalność',
  13: 'Odwrotność',
  14: 'Sferyczność – krzywizna',
  15: 'Dynamiczność',
  16: 'Działanie częściowe lub nadmiarowe',
  17: 'Inny wymiar',
  18: 'Drgania mechaniczne',
  19: 'Działanie okresowe',
  20: 'Ciągłość użytecznego działania',
  21: 'Przyspieszenie',
  22: 'Zamiana szkody w korzyść',
  23: 'Sprzężenie zwrotne',
  24: 'Pośrednik',
  25: 'Samoobsługa',
  26: 'Kopiowanie',
  27: 'Tanie obiekty krótkotrwałe',
  28: 'Zastąpienie układu mechanicznego',
  29: 'Pneumatyka i hydraulika',
  30: 'Elastyczne powłoki i cienkie błony',
  31: 'Materiały porowate',
  32: 'Zmiana barwy',
  33: 'Jednorodność',
  34: 'Odrzucanie i regeneracja',
  35: 'Zmiana parametrów',
  36: 'Przemiany fazowe',
  37: 'Rozszerzalność cieplna',
  38: 'Silne utleniacze',
  39: 'Atmosfera obojętna',
  40: 'Materiały kompozytowe',
};

/** Best available descriptive name for a TRIZ principle id: provided name,
 *  else canonical Polish table, else — as a last resort — the numeric id. */
export function principleName(id: number, provided?: string | null): string {
  const trimmed = provided?.trim();
  if (trimmed) return trimmed;
  return TRIZ_PRINCIPLE_NAMES[id] ?? `Zasada ${id}`;
}
