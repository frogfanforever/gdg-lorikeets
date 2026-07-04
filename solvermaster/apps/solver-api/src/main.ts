/**
 * solver-api — NestJS backend for the inventive-problem solver (Nx monorepo).
 * Endpoint 1: define a problem → a contradiction per available method.
 * Served at root (no global prefix) so the shared be_eval dataset runs unchanged.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🧠 solver-api on http://localhost:${port}`);
}

bootstrap();
