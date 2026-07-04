import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

/** Thin client for the stateless pytriz TRIZ engine (solver-be). Base = TRIZ_SERVICE_URL. */
@Injectable()
export class EngineClient {
  private readonly log = new Logger('EngineClient');
  private readonly base = (process.env.TRIZ_SERVICE_URL || '').replace(/\/$/, '');

  private async call(path: string, init?: RequestInit): Promise<any> {
    if (!this.base) throw new ServiceUnavailableException('TRIZ_SERVICE_URL not configured');
    const res = await fetch(`${this.base}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new ServiceUnavailableException(`engine ${path} → ${res.status}`);
    return res.json();
  }

  analyze(title: string, statement: string) {
    return this.call('/analyze', { method: 'POST', body: JSON.stringify({ title, statement }) });
  }
  matrixCell(improving: number, preserving: number) {
    return this.call(`/matrix/cell?improving=${improving}&preserving=${preserving}`);
  }
  recommend(improving: string, preserving: string, ids: number[]) {
    return this.call('/recommend', {
      method: 'POST',
      body: JSON.stringify({ improving, preserving, selected_principle_ids: ids }),
    });
  }
  listParameters() { return this.call('/parameters'); }
  searchParameters(q: string, limit = 5) { return this.call(`/parameters?q=${encodeURIComponent(q)}&limit=${limit}`); }
  getParameter(id: number) { return this.call(`/parameters/${id}`); }
  listPrinciples() { return this.call('/principles'); }
  getPrinciple(id: number) { return this.call(`/principles/${id}`); }
}
