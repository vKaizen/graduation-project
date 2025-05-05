import { Injectable } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationType } from './schema/notifications.schema';

@Injectable()
export class NotificationEventsService {
  constructor(private readonly notificationsService: NotificationsService) {}

  /**
   * Create a notification when a user receives a workspace invitation
   */
  async onInviteReceived(
    userId: string,
    inviterId: string,
    inviterName: string,
    workspaceId: string,
    workspaceName: string,
  ) {
    console.log(`Creating invite_received notification for user ${userId}`);
    await this.notificationsService.create({
      userId,
      type: 'invite_received',
      title: 'New Workspace Invitation',
      message: `You have been invited to join ${workspaceName} workspace`,
      metadata: {
        workspaceId,
        workspaceName,
        inviterId,
        inviterName,
      },
    });
  }

  /**
   * Create a notification when a user accepts a workspace invitation
   */
  async onInviteAccepted(
    inviterId: string,
    inviteeId: string,
    inviteeName: string,
    workspaceId: string,
    workspaceName: string,
  ) {
    console.log(`Creating invite_accepted notification for user ${inviterId}`);
    await this.notificationsService.create({
      userId: inviterId,
      type: 'invite_accepted',
      title: 'Invitation Accepted',
      message: `${inviteeName} has accepted your invitation to ${workspaceName} workspace`,
      metadata: {
        workspaceId,
        workspaceName,
        userId: inviteeId,
        userName: inviteeName,
      },
    });
  }

  /**
   * Create a notification when a user rejects a workspace invitation
   */
  async onInviteRejected(
    inviterId: string,
    inviteeId: string,
    inviteeName: string,
    workspaceId: string,
    workspaceName: string,
  ) {
    await this.notificationsService.create({
      userId: inviterId,
      type: 'invite_rejected',
      title: 'Invitation Rejected',
      message: `${inviteeName} has declined your invitation to ${workspaceName} workspace`,
      metadata: {
        workspaceId,
        workspaceName,
        userId: inviteeId,
        userName: inviteeName,
      },
    });
  }

  /**
   * Create a system notification for a user
   */
  async sendSystemNotification(
    userId: string,
    title: string,
    message: string,
    metadata?: Record<string, any>,
  ) {
    await this.notificationsService.create({
      userId,
      type: 'system_message',
      title,
      message,
      metadata,
    });
  }

  /**
   * Create a notification when a task is assigned to a user
   */
  async onTaskAssigned(
    userId: string,
    assignerId: string,
    assignerName: string,
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
  ) {
    console.log('🔍 [NOTIFICATION-EVENTS] onTaskAssigned called with:', {
      userId,
      assignerId,
      assignerName,
      taskId,
      taskTitle,
      projectId,
      projectName,
    });

    try {
      await this.notificationsService.create({
        userId,
        type: 'task_assigned',
        title: 'New Task Assigned',
        message: `${assignerName} has assigned you the task "${taskTitle}"`,
        metadata: {
          taskId,
          taskTitle,
          projectId,
          projectName,
          assignerId,
          assignerName,
        },
      });
      console.log(
        '✅ [NOTIFICATION-EVENTS] Successfully created task_assigned notification for user:',
        userId,
      );
    } catch (error) {
      console.error(
        '🚫 [NOTIFICATION-EVENTS] Failed to create task_assigned notification:',
        error,
      );
      console.error('🚫 [NOTIFICATION-EVENTS] Error details:', error.message);
      console.error('🚫 [NOTIFICATION-EVENTS] Error stack:', error.stack);
      throw error; // Re-throw to allow proper error handling upstream
    }
  }

  /**
   * Create a notification when a task is marked as completed
   */
  async onTaskCompleted(
    creatorId: string,
    completerId: string,
    completerName: string,
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
  ) {
    // Only notify the task creator if they're different from the completer
    if (creatorId !== completerId) {
      await this.notificationsService.create({
        userId: creatorId,
        type: 'task_completed',
        title: 'Task Completed',
        message: `${completerName} has completed the task "${taskTitle}"`,
        metadata: {
          taskId,
          taskTitle,
          projectId,
          projectName,
          completerId,
          completerName,
        },
      });
    }
  }

  /**
   * Create a notification when a new comment is added to a task
   */
  async onCommentAdded(
    recipientId: string,
    commenterId: string,
    commenterName: string,
    taskId: string,
    taskTitle: string,
    commentId: string,
    commentSnippet: string,
  ) {
    // Don't notify the commenter about their own comment
    if (recipientId !== commenterId) {
      await this.notificationsService.create({
        userId: recipientId,
        type: 'comment_added',
        title: 'New Comment',
        message: `${commenterName} commented on "${taskTitle}": "${commentSnippet.substring(0, 50)}${commentSnippet.length > 50 ? '...' : ''}"`,
        metadata: {
          taskId,
          taskTitle,
          commentId,
          commenterId,
          commenterName,
        },
      });
    }
  }

  /**
   * Create a notification when a project status is changed
   */
  async onProjectStatusChanged(
    userId: string,
    updaterId: string,
    updaterName: string,
    projectId: string,
    projectName: string,
    oldStatus: string,
    newStatus: string,
  ) {
    // Don't notify the updater about their own update
    if (userId !== updaterId) {
      await this.notificationsService.create({
        userId,
        type: 'project_status_changed',
        title: 'Project Status Changed',
        message: `${updaterName} has changed the status of project "${projectName}" from ${oldStatus} to ${newStatus}`,
        metadata: {
          projectId,
          projectName,
          updaterId,
          updaterName,
          oldStatus,
          newStatus,
        },
      });
    }
  }

  /**
   * Create a notification when a project is updated
   */
  async onProjectUpdated(
    userId: string,
    updaterId: string,
    updaterName: string,
    projectId: string,
    projectName: string,
    updateAction: string,
  ) {
    // Don't notify the updater about their own update
    if (userId !== updaterId) {
      await this.notificationsService.create({
        userId,
        type: 'project_status_changed', // Reuse this type for now
        title: 'Project Updated',
        message: `${updaterName} has ${updateAction} for project "${projectName}"`,
        metadata: {
          projectId,
          projectName,
          updaterId,
          updaterName,
          updateAction,
        },
      });
    }
  }

  /**
   * Create a notification when a new member is added to project or workspace
   */
  async onMemberAdded(
    userId: string,
    adderId: string,
    adderName: string,
    entityId: string,
    entityName: string,
    entityType: 'project' | 'workspace',
    role: string,
  ) {
    await this.notificationsService.create({
      userId,
      type: 'member_added',
      title: `Added to ${entityType.charAt(0).toUpperCase() + entityType.slice(1)}`,
      message: `${adderName} has added you to the ${entityType} "${entityName}" as ${role}`,
      metadata: {
        entityId,
        entityName,
        entityType,
        adderId,
        adderName,
        role,
      },
    });
  }

  /**
   * Create a notification for approaching deadlines
   */
  async onDeadlineApproaching(
    userId: string,
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    dueDate: Date,
    daysRemaining: number,
  ) {
    await this.notificationsService.create({
      userId,
      type: 'deadline_approaching',
      title: 'Deadline Approaching',
      message:
        daysRemaining <= 1
          ? `Task "${taskTitle}" is due tomorrow!`
          : `Task "${taskTitle}" is due in ${daysRemaining} days`,
      metadata: {
        taskId,
        taskTitle,
        projectId,
        projectName,
        dueDate: dueDate.toISOString(),
        daysRemaining,
      },
    });
  }

  /**
   * Create a notification for overdue tasks
   */
  async onTaskOverdue(
    userId: string,
    taskId: string,
    taskTitle: string,
    projectId: string,
    projectName: string,
    dueDate: Date,
    daysOverdue: number,
  ) {
    await this.notificationsService.create({
      userId,
      type: 'task_overdue',
      title: 'Task Overdue',
      message:
        daysOverdue <= 1
          ? `Task "${taskTitle}" is overdue since yesterday`
          : `Task "${taskTitle}" is overdue by ${daysOverdue} days`,
      metadata: {
        taskId,
        taskTitle,
        projectId,
        projectName,
        dueDate: dueDate.toISOString(),
        daysOverdue,
      },
    });
  }
}
