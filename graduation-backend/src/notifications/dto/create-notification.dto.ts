import {
  IsString,
  IsEnum,
  IsMongoId,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '../schema/notifications.schema';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsEnum([
    'invite_received',
    'invite_accepted',
    'invite_rejected',
    'system_message',
    'task_assigned',
    'task_completed',
    'comment_added',
    'project_status_changed',
    'member_added',
    'deadline_approaching',
    'task_overdue',
  ])
  type: NotificationType;

  @IsMongoId()
  userId: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
