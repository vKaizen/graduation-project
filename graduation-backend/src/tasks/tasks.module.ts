/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schema/tasks.schema';
import { Section, SectionSchema } from '../sections/schema/sections.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ProjectsModule } from 'src/projects/projects.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineSchedulerService } from './deadline-scheduler.service';

@Module({
  imports: [
    ProjectsModule,
    NotificationsModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Section.name, schema: SectionSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, DeadlineSchedulerService],
  exports: [TasksService],
})
export class TasksModule {}
