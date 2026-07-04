import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Project } from './project/project.model';
import { Task } from './task/task.model';
import { ProjectModule } from './project/project.module';
import { TaskModule } from './task/task.module';

@Module({
  imports: [
    SequelizeModule.forRoot({
      dialect: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: +(process.env.DB_PORT || 5432),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'example',
      models: [Project, Task],
      autoLoadModels: true,
      // Off by default (local dev + evals use the pre-seeded schema in docker/init).
      // Set DB_SYNC=true in Cloud Run so the API creates its own tables on boot.
      // For Cloud SQL, DB_HOST is the unix socket dir (/cloudsql/<conn>); the pg
      // driver connects via socket automatically when host is a filesystem path.
      synchronize: process.env.DB_SYNC === 'true',
    }),
    ProjectModule,
    TaskModule,
  ],
})
export class AppModule {}
