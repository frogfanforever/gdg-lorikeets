import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Principle, SessionState } from './models';

// FE talks to solver-api directly (CORS). Override via window.SOLVER_API.
const API_BASE: string =
  (globalThis as any).SOLVER_API ?? 'https://solver-api-66obdg3tha-ew.a.run.app';

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
  getSession(id: string): Observable<SessionState> {
    return this.http.get<SessionState>(`${this.base}/sessions/${id}`);
  }
  getPrinciple(id: number): Observable<Principle> {
    return this.http.get<Principle>(`${this.base}/principles/${id}`);
  }
  searchParameters(q: string, limit = 5): Observable<{ parameters: any[] }> {
    return this.http.get<{ parameters: any[] }>(`${this.base}/parameters?q=${encodeURIComponent(q)}&limit=${limit}`);
  }
}
