/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from '../tasks/schema/tasks.schema';
import { Project } from '../projects/schema/projects.schema';

export interface TimelineData {
  dates: string[];
  counts: number[];
}

export interface ProjectStatistics {
  totalTasks: number;
  completedTasks: number;
  completionRate: number;
  tasksByProject: Record<
    string,
    {
      totalTasks: number;
      completedTasks: number;
    }
  >;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async getTaskCompletionTimeline(
    startDate: Date,
    endDate: Date,
    projectIds?: string[],
  ): Promise<TimelineData> {
    try {
      this.logger.log(
        `Getting task completion timeline from ${startDate} to ${endDate} for projects: ${
          projectIds ? projectIds.join(', ') : 'all'
        }`,
      );

      // Debug log the date parameters
      this.logger.log(`startDate year: ${startDate.getFullYear()}`);
      this.logger.log(`endDate year: ${endDate.getFullYear()}`);

      // First, check if we have any completed tasks at all, ignoring date filters
      const allCompletedTasks = await this.taskModel
        .find({
          status: 'completed',
        })
        .exec();

      this.logger.log(
        `FOUND TASKS: Total completed tasks in database (ignoring dates): ${allCompletedTasks.length}`,
      );

      // Log a sample of completed tasks with their timestamps for debugging
      if (allCompletedTasks.length > 0) {
        this.logger.log('SAMPLE OF COMPLETED TASKS (up to 5):');
        for (let i = 0; i < Math.min(5, allCompletedTasks.length); i++) {
          const task = allCompletedTasks[i];
          this.logger.log(`Task ${i + 1}:`);
          this.logger.log(`  ID: ${task._id}`);
          this.logger.log(`  Title: ${task.title}`);
          this.logger.log(`  CompletedAt: ${task.completedAt}`);
          this.logger.log(
            `  CompletedAt Year: ${task.completedAt ? task.completedAt.getFullYear() : 'N/A'}`,
          );
          this.logger.log(
            `  CompletedAt Month: ${task.completedAt ? task.completedAt.getMonth() + 1 : 'N/A'}`,
          );
          this.logger.log(
            `  CompletedAt Day: ${task.completedAt ? task.completedAt.getDate() : 'N/A'}`,
          );
          this.logger.log(`  Project: ${task.project}`);
        }
      } else {
        this.logger.log('NO COMPLETED TASKS FOUND IN DATABASE');
      }

      // Create filter for query that focuses on 2025 dates primarily
      const filter: any = {
        status: 'completed',
        completedAt: { $gte: startDate, $lte: endDate },
      };

      // If project IDs are provided, filter by them
      if (projectIds && projectIds.length > 0) {
        // Convert string IDs to ObjectIds
        const objectIds = projectIds.map((id) => new Types.ObjectId(id));
        filter.project = { $in: objectIds };
      }

      // Log the full filter being used
      this.logger.log(`QUERY FILTER: ${JSON.stringify(filter)}`);

      // Get all completed tasks in the date range
      const completedTasks = await this.taskModel.find(filter).exec();
      this.logger.log(
        `Found ${completedTasks.length} completed tasks matching date filter`,
      );

      // Try a more permissive date filter if we found no tasks
      if (completedTasks.length === 0) {
        this.logger.log(
          'No tasks found with specific date filter, trying a wider date range',
        );

        // Create a filter with a much wider date range
        const wideFilter = {
          status: 'completed',
        };

        if (projectIds && projectIds.length > 0) {
          const objectIds = projectIds.map((id) => new Types.ObjectId(id));
          wideFilter['project'] = { $in: objectIds };
        }

        const anyTasks = await this.taskModel.find(wideFilter).exec();
        this.logger.log(
          `Found ${anyTasks.length} completed tasks with wider filter (no date constraints)`,
        );

        if (anyTasks.length > 0) {
          this.logger.log('Dates of completed tasks with wider filter:');
          for (let i = 0; i < Math.min(5, anyTasks.length); i++) {
            if (anyTasks[i].completedAt) {
              this.logger.log(
                `Task ${i + 1} completed at: ${anyTasks[i].completedAt}`,
              );
            } else {
              this.logger.log(`Task ${i + 1} has no completedAt timestamp`);
            }
          }
        }
      }

      // Log the first few tasks to verify dates
      if (completedTasks.length > 0) {
        this.logger.log(
          `Sample task completedAt: ${completedTasks[0].completedAt}`,
        );
        this.logger.log(
          `Sample task completedAt year: ${completedTasks[0].completedAt.getFullYear()}`,
        );
      }

      // Group tasks by date
      const groupedByDate = this.groupTasksByDate(
        completedTasks,
        startDate,
        endDate,
      );

      return groupedByDate;
    } catch (error) {
      this.logger.error(
        `Error getting task completion timeline: ${error.message}`,
      );
      throw error;
    }
  }

  async getProjectStatistics(
    projectIds?: string[],
  ): Promise<ProjectStatistics> {
    try {
      // Create filter for query
      const filter: any = {};

      // If project IDs are provided, filter by them
      if (projectIds && projectIds.length > 0) {
        // Convert string IDs to ObjectIds
        const objectIds = projectIds.map((id) => new Types.ObjectId(id));
        filter.project = { $in: objectIds };
      }

      // Get all tasks
      const tasks = await this.taskModel.find(filter).exec();
      this.logger.log(`Found ${tasks.length} tasks for statistics`);

      // Count total and completed tasks
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (task) => task.status === 'completed',
      ).length;
      const completionRate =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      // Group tasks by project
      const tasksByProject: Record<
        string,
        { totalTasks: number; completedTasks: number }
      > = {};
      for (const task of tasks) {
        const projectId = task.project.toString();
        if (!tasksByProject[projectId]) {
          tasksByProject[projectId] = {
            totalTasks: 0,
            completedTasks: 0,
          };
        }

        tasksByProject[projectId].totalTasks++;
        if (task.status === 'completed') {
          tasksByProject[projectId].completedTasks++;
        }
      }

      return {
        totalTasks,
        completedTasks,
        completionRate: Math.round(completionRate),
        tasksByProject,
      };
    } catch (error) {
      this.logger.error(`Error getting project statistics: ${error.message}`);
      throw error;
    }
  }

  private groupTasksByDate(
    tasks: Task[],
    startDate: Date,
    endDate: Date,
  ): TimelineData {
    // Create a map of all dates in the range
    const dateMap = new Map<string, number>();

    // Initialize all dates with 0 tasks
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dateString = currentDate.toISOString().split('T')[0]; // YYYY-MM-DD
      dateMap.set(dateString, 0);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Count completed tasks for each date
    for (const task of tasks) {
      if (task.completedAt) {
        const dateString = task.completedAt.toISOString().split('T')[0];
        if (dateMap.has(dateString)) {
          dateMap.set(dateString, dateMap.get(dateString) + 1);
          this.logger.debug(
            `Incremented count for ${dateString} to ${dateMap.get(dateString)}`,
          );
        } else {
          this.logger.debug(
            `Date ${dateString} not found in date range (${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]})`,
          );
        }
      }
    }

    // Convert map to arrays for response
    const dates: string[] = [];
    const counts: number[] = [];

    dateMap.forEach((count, date) => {
      dates.push(date);
      counts.push(count);
    });

    return { dates, counts };
  }

  async getCompletedTasksDebug(): Promise<any> {
    try {
      this.logger.log('DEBUG: Searching for all completed tasks in database');

      // Find all tasks with status "completed"
      const completedTasks = await this.taskModel
        .find({ status: 'completed' })
        .limit(20) // Limit to 20 to avoid large responses
        .exec();

      this.logger.log(
        `DEBUG: Found ${completedTasks.length} tasks with status=completed`,
      );

      // Check for tasks with both status="completed" and the completedAt field set
      const tasksWithCompletedAt = completedTasks.filter(
        (task) => task.completedAt !== null && task.completedAt !== undefined,
      );

      this.logger.log(
        `DEBUG: Found ${tasksWithCompletedAt.length} tasks with both status=completed and completedAt set`,
      );

      // Debug log a sample of tasks with their completedAt fields
      if (tasksWithCompletedAt.length > 0) {
        this.logger.log(
          'DEBUG: Sample of completed tasks with completedAt field:',
        );

        for (let i = 0; i < Math.min(5, tasksWithCompletedAt.length); i++) {
          const task = tasksWithCompletedAt[i];
          this.logger.log(`DEBUG: Task ${i + 1}:`);
          this.logger.log(`- ID: ${task._id}`);
          this.logger.log(`- Title: ${task.title}`);
          this.logger.log(`- Status: ${task.status}`);
          this.logger.log(`- CompletedAt: ${task.completedAt}`);
          if (task.completedAt) {
            this.logger.log(
              `- CompletedAt Year: ${task.completedAt.getFullYear()}`,
            );
            this.logger.log(
              `- CompletedAt Month: ${task.completedAt.getMonth() + 1}`,
            );
            this.logger.log(`- CompletedAt Day: ${task.completedAt.getDate()}`);
          }
          this.logger.log(
            `- Project: ${task.project ? task.project.toString() : 'Not set'}`,
          );
        }
      }

      // Return debug information
      return {
        count: completedTasks.length,
        countWithCompletedAt: tasksWithCompletedAt.length,
        samples: tasksWithCompletedAt.slice(0, 5).map((task) => ({
          id: task._id.toString(),
          title: task.title,
          status: task.status,
          completedAt: task.completedAt ? task.completedAt.toISOString() : null,
          project: task.project ? task.project.toString() : null,
        })),
      };
    } catch (error) {
      this.logger.error(
        `DEBUG: Error finding completed tasks: ${error.message}`,
      );
      throw error;
    }
  }
}
