/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { SectionsModule } from './sections/sections.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    AuthModule,
    UsersModule,
    ProjectsModule,
    SectionsModule,
    TasksModule,
    CommentsModule,
    WorkspacesModule,
    ActivityLogsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
