/* eslint-disable prettier/prettier */
import { Types } from 'mongoose';

export class UpdateTaskDto {
  readonly title?: string;
  readonly description?: string;
  readonly dueDate?: Date;
  readonly status?: string;
  readonly assignee?: Types.ObjectId[];
  readonly priority?: string;
  readonly tags?: Types.ObjectId[];
  readonly attachments?: string[];
}
