import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

// Rough wiring: the FE talks to solver-api directly (CORS enabled). Override at runtime
// via window.SOLVER_API. Proper config comes with the design-system FE work.
const API_BASE: string =
  (globalThis as any).SOLVER_API ?? 'https://solver-api-66obdg3tha-ew.a.run.app';

export interface Param { id: number; name: string; confidence?: number; alternatives?: Param[] }
export interface Principle { id: number; name: string; description?: string; rules?: string[]; hints?: string[]; examples?: string[] }
export interface SessionState {
  session_id: string;
  problem: { title?: string; statement: string };
  analysis: { improving: Param; preserving: Param } | null;
  parameters: { improving: Param; preserving: Param } | null;
  matrix: { cell: { improving_id: number; preserving_id: number }; principles: Principle[] } | null;
  selected_principle_ids: number[] | null;
  recommendation: { text: string; applied_principle_ids: number[] } | null;
  decision_trace: string[];
  metadata: Record<string, unknown>;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = API_BASE;

  createSession(problem: { title?: string; statement: string }): Observable<SessionState> {
    return this.http.post<SessionState>(`${this.base}/sessions`, { problem });
  }
  analyze(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${this.base}/sessions/${id}/analyze`, {});
  }
  setParameters(id: string, improving: number, preserving: number): Observable<SessionState> {
    return this.http.put<SessionState>(`${this.base}/sessions/${id}/parameters`, { improving, preserving });
  }
  matrix(id: string): Observable<SessionState> {
    return this.http.post<SessionState>(`${this.base}/sessions/${id}/matrix`, {});
  }
  recommend(id: string, ids: number[]): Observable<SessionState> {
    return this.http.post<SessionState>(`${this.base}/sessions/${id}/recommendation`, { selected_principle_ids: ids });
  }
  getPrinciple(id: number): Observable<Principle> {
    return this.http.get<Principle>(`${this.base}/principles/${id}`);
  }
}
