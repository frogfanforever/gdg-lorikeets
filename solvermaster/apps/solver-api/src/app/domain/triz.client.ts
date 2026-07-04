import { Injectable, Logger } from '@nestjs/common';
import { Contradiction, Problem } from './types';

export interface ReframeResult {
  contradiction: Contradiction;
  meta: { model: string; params: Record<string, unknown>; tokens: number; cost: number; duration_ms: number };
}

/** TRIZ reframing delegated to the pytriz-backed solver-be service (Python-only lib),
 *  matching the Backend Architecture: NestJS orchestrates, the pytriz service does the
 *  real contradiction-matrix lookup. Set TRIZ_SERVICE_URL to the solver-be URL.
 *  Falls back to a stub framing if the service is unset/unreachable. */
@Injectable()
export class TrizClient {
  private readonly log = new Logger('TrizClient');
  private readonly base = (process.env.TRIZ_SERVICE_URL || '').replace(/\/$/, '');

  async reframe(problem: Problem): Promise<ReframeResult> {
    const t0 = performance.now();
    if (!this.base) return this.fallback(problem, t0, 'TRIZ_SERVICE_URL unset');
    try {
      const res = await fetch(`${this.base}/runs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem, methods: ['triz'] }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`solver-be responded ${res.status}`);
      const data: any = await res.json();
      const c = (data.contradictions ?? []).find((x: any) => x.method === 'triz') ?? data.contradictions?.[0];
      if (!c) throw new Error('no triz contradiction returned');
      const duration_ms = Math.round((performance.now() - t0) * 100) / 100;
      return {
        contradiction: {
          method: 'triz',
          improving: c.improving,
          preserving: c.preserving,
          summary: c.summary,
          ...(c.principles ? { principles: c.principles } : {}),
        },
        meta: { model: 'pytriz-bm25 (via solver-be)', params: { source: this.base }, tokens: 0, cost: 0, duration_ms },
      };
    } catch (e: any) {
      this.log.warn(`pytriz TRIZ unavailable (${e.message}); using stub fallback`);
      return this.fallback(problem, t0, e.message);
    }
  }

  private fallback(problem: Problem, t0: number, reason: string): ReframeResult {
    const duration_ms = Math.round((performance.now() - t0) * 100) / 100;
    return {
      contradiction: {
        method: 'triz',
        improving: 'the objective',
        preserving: 'the key constraint',
        summary: `via triz (fallback): improve ${problem.title} without worsening its key constraint`,
      },
      meta: { model: 'stub-fallback', params: { reason }, tokens: 0, cost: 0, duration_ms },
    };
  }
}
