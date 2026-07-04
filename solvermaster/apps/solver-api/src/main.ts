/**
 * solver-api — NestJS backend for the inventive-problem solver (Nx monorepo).
 * Endpoint 1: define a problem → a contradiction per available method.
 * Served at root (no global prefix) so the shared be_eval dataset runs unchanged.
 */
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('Solver API')
    .setDescription(
      'Inventive-problem solver — define a problem and get a technical contradiction ' +
        'per concept-generation method. TRIZ is backed by pytriz (real 39×39 matrix).',
    )
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 8080;
  await app.listen(port, '0.0.0.0');
  Logger.log(`🧠 solver-api on http://localhost:${port}  (Swagger UI at /docs)`);
}

bootstrap();
