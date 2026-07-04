import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { StepResult } from './types';

interface RunRecord {
  id: string;
  title: string;
  statement: string;
  sdg: string | null;
  methods: string[];
  version: number;
  created_at: number;
}

/** In-memory StepResult store (MVP). Same shape as the Cloud SQL Postgres in
 *  wiki/design/Backend Architecture — swap this for a Prisma repository later. */
@Injectable()
export class StepStore {
  private readonly runs = new Map<string, RunRecord>();
  private readonly steps = new Map<string, StepResult[]>();

  private id(): string {
    return randomUUID().replace(/-/g, '').slice(0, 12);
  }

  createRun(title: string, statement: string, sdg: string | null, methods: string[]): string {
    const id = this.id();
    this.runs.set(id, { id, title, statement, sdg, methods, version: 1, created_at: Date.now() });
    this.steps.set(id, []);
    return id;
  }

  recordStep(step: Omit<StepResult, 'id' | 'created_at'>): string {
    const full: StepResult = { ...step, id: this.id(), created_at: Date.now() };
    this.steps.get(step.run_id)?.push(full);
    return full.id;
  }

  getRun(id: string): RunRecord | null {
    return this.runs.get(id) ?? null;
  }

  listSteps(id: string): StepResult[] {
    return this.steps.get(id) ?? [];
  }
}
