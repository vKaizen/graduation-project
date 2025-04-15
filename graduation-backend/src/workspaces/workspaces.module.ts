/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspacesController } from './workspaces.controller';
import { WorkspacesService } from './workspaces.service';
import { Workspace, WorkspaceSchema } from './schema/workspaces.schema';
import { AuthModule } from '../auth/auth.module';
import { Project, ProjectSchema } from '../projects/schema/projects.schema';
import { Task, TaskSchema } from '../tasks/schema/tasks.schema';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([
      { name: Workspace.name, schema: WorkspaceSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: Task.name, schema: TaskSchema },
    ]),
  ],
  controllers: [WorkspacesController],
  providers: [WorkspacesService],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
