/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Task, TaskSchema } from './schema/tasks.schema';
import { Section, SectionSchema } from '../sections/schema/sections.schema';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { ProjectsModule } from 'src/projects/projects.module';

@Module({
  imports: [
    ProjectsModule,
    MongooseModule.forFeature([
      { name: Task.name, schema: TaskSchema },
      { name: Section.name, schema: SectionSchema },
    ]),
  ],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
