/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ActivityLog } from './schema/activity-logs.schema';

interface CreateActivityLogDto {
  projectId: string;
  type: 'created' | 'updated' | 'commented' | 'completed';
  content: string;
  user?: {
    userId: string;
    name: string;
  };
}

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectModel(ActivityLog.name) private activityLogModel: Model<ActivityLog>,
  ) {}

  async createLog(logData: CreateActivityLogDto): Promise<ActivityLog> {
    try {
      // Convert string IDs to ObjectIds
      const projectObjectId = new Types.ObjectId(logData.projectId);

      // Process user information
      let userInfo: { userId: Types.ObjectId; name: string };

      if (logData.user && logData.user.userId) {
        // Try to convert userId to ObjectId, fallback if invalid
        try {
          userInfo = {
            userId: new Types.ObjectId(logData.user.userId),
            name: logData.user.name || 'Unknown User',
          };
        } catch (error) {
          console.warn('Invalid userId format, using system user');
          userInfo = {
            userId: new Types.ObjectId(),
            name: 'System User',
          };
        }
      } else {
        // Default to system user if no user provided
        userInfo = {
          userId: new Types.ObjectId(),
          name: 'System User',
        };
      }

      // Create the activity log
      const newLog = new this.activityLogModel({
        projectId: projectObjectId,
        type: logData.type,
        user: userInfo,
        content: logData.content,
        timestamp: new Date(),
      });

      // Save and return the log
      return await newLog.save();
    } catch (error) {
      console.error('Error creating activity log:', error);
      throw error;
    }
  }

  async getLogsByProjectId(projectId: string): Promise<ActivityLog[]> {
    try {
      return this.activityLogModel
        .find({ projectId: new Types.ObjectId(projectId) })
        .sort({ timestamp: -1 }) // Most recent first
        .exec();
    } catch (error) {
      console.error(`Error fetching logs for project ${projectId}:`, error);
      throw error;
    }
  }
}
