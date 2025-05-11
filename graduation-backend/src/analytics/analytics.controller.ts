/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TimelineData, ProjectStatistics } from './analytics.service';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  private readonly logger = new Logger(AnalyticsController.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('task-completion-timeline')
  async getTaskCompletionTimeline(
    @Query('startDate') startDateStr: string,
    @Query('endDate') endDateStr: string,
    @Query('projectIds') projectIdsStr: string,
  ): Promise<TimelineData> {
    try {
      // Debug the received date strings
      this.logger.log(`Received startDate string: ${startDateStr}`);
      this.logger.log(`Received endDate string: ${endDateStr}`);

      // Validate dates
      if (!startDateStr || !endDateStr) {
        throw new BadRequestException('startDate and endDate are required');
      }

      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);

      // Debug the parsed dates
      this.logger.log(`Parsed startDate: ${startDate}`);
      this.logger.log(`Parsed startDate year: ${startDate.getFullYear()}`);
      this.logger.log(`Parsed startDate month: ${startDate.getMonth() + 1}`);
      this.logger.log(`Parsed endDate: ${endDate}`);
      this.logger.log(`Parsed endDate year: ${endDate.getFullYear()}`);
      this.logger.log(`Parsed endDate month: ${endDate.getMonth() + 1}`);

      // Validate date parsing
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid date format');
      }

      // Parse project IDs if provided
      let projectIds: string[] | undefined;
      if (projectIdsStr) {
        projectIds = projectIdsStr.split(',');
      }

      this.logger.log(
        `Requesting task completion timeline from ${startDate} to ${endDate}${
          projectIds ? ` for projects: ${projectIds.join(', ')}` : ''
        }`,
      );

      return this.analyticsService.getTaskCompletionTimeline(
        startDate,
        endDate,
        projectIds,
      );
    } catch (error) {
      this.logger.error(`Error in getTaskCompletionTimeline: ${error.message}`);
      throw error;
    }
  }

  @Get('project-statistics')
  async getProjectStatistics(
    @Query('projectIds') projectIdsStr: string,
  ): Promise<ProjectStatistics> {
    try {
      // Parse project IDs if provided
      let projectIds: string[] | undefined;
      if (projectIdsStr) {
        projectIds = projectIdsStr.split(',');
      }

      this.logger.log(
        `Requesting project statistics${
          projectIds ? ` for projects: ${projectIds.join(', ')}` : ''
        }`,
      );

      return this.analyticsService.getProjectStatistics(projectIds);
    } catch (error) {
      this.logger.error(`Error in getProjectStatistics: ${error.message}`);
      throw error;
    }
  }

  @Get('debug/completed-tasks')
  async getCompletedTasksDebug(): Promise<any> {
    try {
      this.logger.log('DEBUG: Checking for any completed tasks in database');

      // Use the analytics service to find all completed tasks in the database
      const result = await this.analyticsService.getCompletedTasksDebug();

      this.logger.log(`DEBUG: Found ${result.count} completed tasks`);

      return result;
    } catch (error) {
      this.logger.error(`Error in getCompletedTasksDebug: ${error.message}`);
      throw error;
    }
  }
}
