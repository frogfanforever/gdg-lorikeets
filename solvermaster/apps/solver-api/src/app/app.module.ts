import { Module } from '@nestjs/common';
import { MiscController } from './misc.controller';
import { ReferenceController } from './reference.controller';
import { RunsController } from './runs/runs.controller';
import { RunsService } from './runs/runs.service';
import { SessionsController } from './sessions/sessions.controller';
import { SessionsService } from './sessions/sessions.service';
import { SessionStore } from './sessions/session.store';
import { ReframeService } from './domain/reframe.service';
import { StepStore } from './domain/store.service';
import { MethodRegistry } from './domain/methods';
import { TrizClient } from './domain/triz.client';
import { EngineClient } from './domain/engine.client';
import { SolverGateway } from './agent/solver.gateway';
import { AgentRunnerService } from './agent/agent-runner.service';

@Module({
  controllers: [MiscController, RunsController, SessionsController, ReferenceController],
  providers: [
    RunsService, ReframeService, TrizClient, StepStore, MethodRegistry,
    SessionsService, SessionStore, EngineClient,
    SolverGateway, AgentRunnerService,
  ],
})
export class AppModule {}
