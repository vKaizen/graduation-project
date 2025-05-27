/* eslint-disable prettier/prettier */
import { Module, forwardRef } from '@nestjs/common';
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
import { NotificationsModule } from '../notifications/notifications.module';
import { Task, TaskSchema } from '../tasks/schema/tasks.schema';
import { PortfoliosModule } from '../portfolios/portfolios.module';
import { GoalsModule } from '../goals/goals.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
    SectionsModule, // Import the Sections module
    AuthModule,
    ActivityLogsModule, // Import the ActivityLogs module
    WorkspacesModule, // Import the Workspaces module
    NotificationsModule, // Import the Notifications module
    PortfoliosModule, // Import the Portfolios module to clean up references when deleting projects
    forwardRef(() => GoalsModule), // Import the Goals module to update goals when projects are deleted
  ],
  controllers: [ProjectsController, WorkspaceProjectsController],
  providers: [ProjectsService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
