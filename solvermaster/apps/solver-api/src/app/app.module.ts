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

@Module({
  controllers: [MiscController, RunsController, SessionsController, ReferenceController],
  providers: [
    RunsService, ReframeService, TrizClient, StepStore, MethodRegistry,
    SessionsService, SessionStore, EngineClient,
  ],
})
export class AppModule {}
