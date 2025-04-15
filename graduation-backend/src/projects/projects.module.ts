/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectsService } from './projects.service';
import {
  ProjectsController,
  WorkspaceProjectsController,
} from './projects.controller';
import { Project, ProjectSchema } from './schema/projects.schema';
import { SectionsModule } from '../sections/sections.module';
import { AuthModule } from 'src/auth/auth.module';
import { ActivityLogsModule } from '../activity-logs/activity-logs.module';
import { WorkspacesModule } from '../workspaces/workspaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Project.name, schema: ProjectSchema }]),
    SectionsModule, // Import the Sections module
    AuthModule,
    ActivityLogsModule, // Import the ActivityLogs module
    WorkspacesModule, // Import the Workspaces module
  ],
  controllers: [ProjectsController, WorkspaceProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
