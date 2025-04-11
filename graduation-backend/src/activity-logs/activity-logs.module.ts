/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ActivityLogsService } from './activity-logs.service';
import { ActivityLog, ActivityLogSchema } from './schema/activity-logs.schema';
import { ProjectActivityListenerService } from './project-activity-listener.service';
import { Project, ProjectSchema } from '../projects/schema/projects.schema';
import { ActivityLogsController } from './activity-logs.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ActivityLog.name, schema: ActivityLogSchema },
      { name: Project.name, schema: ProjectSchema },
    ]),
  ],
  controllers: [ActivityLogsController],
  providers: [ActivityLogsService, ProjectActivityListenerService],
  exports: [ActivityLogsService],
})
export class ActivityLogsModule {}
