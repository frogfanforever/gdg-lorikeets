import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { MANDATORY_METHOD, MethodRegistry } from '../domain/methods';
import { ReframeService } from '../domain/reframe.service';
import { StepStore } from '../domain/store.service';
import { Problem } from '../domain/types';

@Injectable()
export class RunsService {
  constructor(
    private readonly registry: MethodRegistry,
    private readonly reframe: ReframeService,
    private readonly store: StepStore,
  ) {}

  create(body: any) {
    const p = body?.problem ?? {};
    const title = (p.title ?? '').trim();
    const statement = (p.statement ?? '').trim();
    if (!title || !statement) {
      throw new BadRequestException('problem.title and problem.statement are required');
    }

    const methods: string[] =
      Array.isArray(body?.methods) && body.methods.length ? body.methods : this.registry.available();
    const unknown = methods.filter((m) => !this.registry.has(m));
    if (unknown.length) {
      throw new UnprocessableEntityException({
        error: `unknown methods: ${unknown.join(', ')}`,
        available: this.registry.available(),
      });
    }
    if (!methods.includes(MANDATORY_METHOD)) {
      throw new UnprocessableEntityException(`TRIZ is mandatory: include '${MANDATORY_METHOD}' in methods`);
    }

    const problem: Problem = { title, statement, sdg: p.sdg ?? null };
    const runId = this.store.createRun(title, statement, problem.sdg ?? null, methods);

    const contradictions = methods.map((method) => {
      const { contradiction, meta } = this.reframe.reframe(problem, method);
      this.store.recordStep({
        run_id: runId,
        step: 'reframe',
        method,
        inputs: { problem },
        output: contradiction,
        model: meta.model,
        params: meta.params,
        tokens: meta.tokens,
        cost: meta.cost,
        duration_ms: meta.duration_ms,
        status: 'ok',
        version: 1,
      });
      return contradiction;
    });

    return { run_id: runId, problem, methods, contradictions };
  }

  get(runId: string) {
    const run = this.store.getRun(runId);
    if (!run) throw new NotFoundException(`run ${runId} not found`);
    const steps = this.store.listSteps(runId);
    return {
      run_id: runId,
      problem: { title: run.title, statement: run.statement, sdg: run.sdg },
      methods: run.methods,
      contradictions: steps.filter((s) => s.step === 'reframe').map((s) => s.output),
      steps,
    };
  }
}
