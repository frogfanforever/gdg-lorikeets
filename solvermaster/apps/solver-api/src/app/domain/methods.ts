import { Injectable } from '@nestjs/common';

/** A pluggable concept-generation strategy (TRIZ mandatory + a swappable second). */
export interface ConceptGenerationMethod {
  readonly name: string;
}

export class TrizMethod implements ConceptGenerationMethod {
  readonly name = 'triz';
}

export class ScamperMethod implements ConceptGenerationMethod {
  readonly name = 'scamper';
}

export const MANDATORY_METHOD = 'triz';

@Injectable()
export class MethodRegistry {
  // Register methods here; TRIZ stays mandatory (enforced in RunsService).
  private readonly methods: ConceptGenerationMethod[] = [new TrizMethod(), new ScamperMethod()];

  available(): string[] {
    return this.methods.map((m) => m.name);
  }

  has(name: string): boolean {
    return this.available().includes(name);
  }
}
