/* eslint-disable prettier/prettier */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schema/tasks.schema';
import { Section, SectionSchema } from '../sections/schema/sections.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ProjectsModule } from '../projects/projects.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { DeadlineSchedulerService } from './deadline-scheduler.service';
import { GoalsModule } from '../goals/goals.module';
import { Goal, GoalSchema } from '../goals/schema/goal.schema';

@Module({
  imports: [
    forwardRef(() => ProjectsModule),
    NotificationsModule,
    forwardRef(() => GoalsModule),
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Section.name, schema: SectionSchema },
      { name: Goal.name, schema: GoalSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService, DeadlineSchedulerService],
  exports: [TasksService],
})
export class TasksModule {}
