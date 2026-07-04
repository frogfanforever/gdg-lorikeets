import { Module } from '@nestjs/common';
import { MiscController } from './misc.controller';
import { RunsController } from './runs/runs.controller';
import { RunsService } from './runs/runs.service';
import { ReframeService } from './domain/reframe.service';
import { StepStore } from './domain/store.service';
import { MethodRegistry } from './domain/methods';

@Module({
  controllers: [MiscController, RunsController],
  providers: [RunsService, ReframeService, StepStore, MethodRegistry],
})
export class AppModule {}
