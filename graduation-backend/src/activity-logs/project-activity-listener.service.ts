/* eslint-disable prettier/prettier */
import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from '../projects/schema/projects.schema';
import { ActivityLogsService } from './activity-logs.service';

@Injectable()
export class ProjectActivityListenerService implements OnModuleInit {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly activityLogsService: ActivityLogsService,
  ) {}

  async onModuleInit() {
    try {
      console.log('Starting Project Activity Listener...');

      // Start watching the projects collection for changes
      const changeStream = this.projectModel.watch(
        [{ $match: { operationType: 'update' } }],
        { fullDocument: 'updateLookup' },
      );

      // Listen for change events
      changeStream.on('change', async (change) => {
        try {
          // Skip if there's no full document
          if (!change.fullDocument) {
            console.log('No full document in change event');
            return;
          }

          const projectId = change.documentKey._id.toString();
          const updatedFields = change.updateDescription?.updatedFields || {};

          console.log(
            `Project ${projectId} was updated. Changed fields:`,
            Object.keys(updatedFields),
          );

          // Check for specific field changes
          if ('name' in updatedFields) {
            await this.logFieldUpdate(
              projectId,
              'name',
              'Updated project title',
            );
          }
        } catch (error) {
          console.error('Error processing change event:', error);
        }
      });

      changeStream.on('error', (error) => {
        console.error('Error in project change stream:', error);
        // Try to restart the listener after a delay
        setTimeout(() => this.onModuleInit(), 5000);
      });

      console.log('Project Activity Listener started successfully');
    } catch (error) {
      console.error('Failed to start Project Activity Listener:', error);
    }
  }

  private async logFieldUpdate(
    projectId: string,
    field: string,
    content: string,
  ) {
    try {
      await this.activityLogsService.createLog({
        projectId,
        type: 'updated',
        content,
        user: {
          userId: 'system',
          name: 'System',
        },
      });
      console.log(`Activity logged for project ${projectId}: ${content}`);
    } catch (error) {
      console.error(`Error logging activity for ${field} update:`, error);
    }
  }
}
