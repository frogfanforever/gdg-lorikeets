import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface SessionStep {
  step: string;
  output: unknown;
  duration_ms: number;
  created_at: number;
}

export interface Session {
  id: string;
  problem: { title?: string; statement: string; sdg?: string | null };
  analysis?: unknown; // engine analyze() result (improving/preserving suggestions)
  parameters?: { improving: { id: number; name: string }; preserving: { id: number; name: string } };
  matrix?: unknown; // { cell, principles }
  selected_principle_ids?: number[];
  recommendation?: unknown; // { text, applied }
  versions: any[]; // snapshots on each recommendation (labelled A, B, ...)
  steps: SessionStep[];
  created_at: number;
}

@Injectable()
export class SessionStore {
  private readonly sessions = new Map<string, Session>();

  create(problem: Session['problem']): Session {
    const id = randomUUID().replace(/-/g, '').slice(0, 12);
    const s: Session = { id, problem, versions: [], steps: [], created_at: Date.now() };
    this.sessions.set(id, s);
    return s;
  }

  get(id: string): Session | null {
    return this.sessions.get(id) ?? null;
  }

  record(id: string, step: string, output: unknown, duration_ms: number): void {
    this.sessions.get(id)?.steps.push({ step, output, duration_ms, created_at: Date.now() });
  }
}
