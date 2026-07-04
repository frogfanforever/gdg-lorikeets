import { Injectable } from '@nestjs/common';
import { Contradiction, Problem } from './types';
import { Llm, parseJsonObject, stubLlm } from './llm';

export interface ReframeMeta {
  model: string;
  params: Record<string, unknown>;
  tokens: number;
  cost: number;
  duration_ms: number;
}

@Injectable()
export class ReframeService {
  /** Reframe the problem as a contradiction *through a method's lens*.
   *  Method-aware prompt so a real LLM differentiates per method; the offline stub
   *  tags the summary with the method. */
  reframe(problem: Problem, method: string, llm: Llm = stubLlm): { contradiction: Contradiction; meta: ReframeMeta } {
    const prompt =
      `Reframe this problem as a technical CONTRADICTION using the ${method} method's lens.\n` +
      `PROBLEM: ${problem.title}\nSTATEMENT: ${problem.statement}\n` +
      'Return JSON: {"improving": <parameter to improve>, "preserving": <parameter that must not worsen>, "summary": <one line>}.';

    const t0 = performance.now();
    const reply = llm(prompt);
    const duration_ms = Math.round((performance.now() - t0) * 100) / 100;
    const obj = parseJsonObject(reply);

    const contradiction: Contradiction = {
      method,
      improving: (obj.improving as string) ?? 'the objective',
      preserving: (obj.preserving as string) ?? 'the key constraint',
      summary: `via ${method}: ` + ((obj.summary as string) ?? `improve ${problem.title}`),
    };
    const meta: ReframeMeta = {
      model: 'stub',
      params: { temperature: 0 },
      tokens: Math.floor((prompt.length + reply.length) / 4),
      cost: 0,
      duration_ms,
    };
    return { contradiction, meta };
  }
}
