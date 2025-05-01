/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NotificationType =
  | 'invite_received'
  | 'invite_accepted'
  | 'invite_rejected'
  | 'system_message'
  | 'task_assigned'
  | 'task_completed'
  | 'comment_added'
  | 'project_status_changed'
  | 'member_added'
  | 'deadline_approaching'
  | 'task_overdue';

@Schema({ timestamps: true })
export class Notification extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({
    type: String,
    enum: [
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
    ],
    required: true,
  })
  type: NotificationType;

  @Prop({ type: Boolean, default: false })
  read: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, required: false })
  metadata: Record<string, any>;

  @Prop({ type: Date, default: Date.now })
  createdAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);
