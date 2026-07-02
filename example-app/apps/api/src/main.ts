/**
 * Example App API — Projects & Tasks (NestJS + Sequelize + Postgres).
 */
import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app/app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: 'http://localhost:4200', credentials: true });

  const config = new DocumentBuilder()
    .setTitle('Example App API')
    .setDescription('Projects & Tasks REST API built with NestJS + Sequelize')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup(globalPrefix, app, SwaggerModule.createDocument(app, config));

  const port = process.env.PORT || 3000;
  await app.listen(port);
  Logger.log(`🚀 API running on http://localhost:${port}/${globalPrefix}`);
}

bootstrap();
