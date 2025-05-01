/* eslint-disable prettier/prettier */
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class DeadlineSchedulerService {
  private readonly logger = new Logger(DeadlineSchedulerService.name);

  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    private notificationEventsService: NotificationEventsService,
  ) {}

  /**
   * Run daily at midnight to check for approaching deadlines and overdue tasks
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDeadlineNotifications() {
    this.logger.debug('Running deadline notification checks');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await this.checkApproachingDeadlines(today);
    await this.checkOverdueTasks(today);
  }

  /**
   * Check for tasks with deadlines approaching in the next 1-3 days
   */
  private async checkApproachingDeadlines(today: Date) {
    // Calculate dates for the next 3 days
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const threeDaysFromNow = new Date(today);
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

    // Find tasks with due dates within the next 1-3 days that are not completed
    const approachingTasks = await this.taskModel
      .find({
        dueDate: {
          $gte: tomorrow,
          $lte: threeDaysFromNow,
        },
        status: { $ne: 'completed' },
        assignee: { $exists: true, $ne: null }, // Only tasks with assignees
      })
      .populate('project')
      .exec();

    this.logger.debug(
      `Found ${approachingTasks.length} tasks with approaching deadlines`,
    );

    // Send notifications for each approaching deadline
    for (const task of approachingTasks) {
      if (!task.assignee || !task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      const diffTime = Math.abs(dueDate.getTime() - today.getTime());
      const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      try {
        await this.notificationEventsService.onDeadlineApproaching(
          task.assignee.toString(),
          task._id.toString(),
          task.title,
          task.project._id.toString(),
          task.project['name'],
          dueDate,
          daysRemaining,
        );
        this.logger.debug(
          `Sent deadline approaching notification for task ${task._id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to send deadline notification for task ${task._id}:`,
          error,
        );
      }
    }
  }

  /**
   * Check for tasks that are overdue
   */
  private async checkOverdueTasks(today: Date) {
    // Find tasks that are overdue and not completed
    const overdueTasks = await this.taskModel
      .find({
        dueDate: { $lt: today },
        status: { $ne: 'completed' },
        assignee: { $exists: true, $ne: null }, // Only tasks with assignees
      })
      .populate('project')
      .exec();

    this.logger.debug(`Found ${overdueTasks.length} overdue tasks`);

    // Send notifications for each overdue task
    for (const task of overdueTasks) {
      if (!task.assignee || !task.dueDate) continue;

      const dueDate = new Date(task.dueDate);
      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const daysOverdue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      try {
        await this.notificationEventsService.onTaskOverdue(
          task.assignee.toString(),
          task._id.toString(),
          task.title,
          task.project._id.toString(),
          task.project['name'],
          dueDate,
          daysOverdue,
        );
        this.logger.debug(`Sent overdue notification for task ${task._id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send overdue notification for task ${task._id}:`,
          error,
        );
      }
    }
  }
}
