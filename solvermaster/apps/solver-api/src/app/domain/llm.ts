/** An LLM turn: prompt in, text out. Swap in Gemini/Vertex/ADK; default is the
 *  offline deterministic stub so the service runs and be_eval passes without keys. */
export type Llm = (prompt: string) => string;

export function parseJsonObject(text: string): Record<string, unknown> {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(text.slice(start, end + 1));
    } catch {
      /* fall through */
    }
  }
  return {};
}

function tag(prompt: string, name: string): string {
  for (const line of prompt.split('\n')) {
    const s = line.trim();
    if (s.toUpperCase().startsWith(name + ':')) return s.slice(s.indexOf(':') + 1).trim();
  }
  return '';
}

/** Deterministic offline stand-in for a real LLM (mirrors ai/solver stub_llm). */
export const stubLlm: Llm = (prompt: string): string => {
  const title = tag(prompt, 'PROBLEM') || 'the problem';
  if (prompt.includes('CONTRADICTION')) {
    return JSON.stringify({
      improving: 'primary objective of the problem',
      preserving: 'the constraint that must not worsen',
      summary: `Improve the goal of ${title} without worsening its key constraint.`,
    });
  }
  return JSON.stringify({ idea: `generic idea for ${title}`, rationale: 'n/a' });
};
