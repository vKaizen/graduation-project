/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UsersModule } from './users/users.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsModule } from './projects/projects.module';
import { TasksModule } from './tasks/tasks.module';
import { TeamsModule } from './teams/teams.module';
import { CommentsModule } from './comments/comments.module';


@Module({
  imports: [
    UsersModule,
    ProjectsModule,
    TasksModule,
    TeamsModule,
    CommentsModule,
    MongooseModule.forRoot('mongodb://localhost:27017/taskmanager'),
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
