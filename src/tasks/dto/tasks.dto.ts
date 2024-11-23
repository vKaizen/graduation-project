/* eslint-disable prettier/prettier */


import { Types } from 'mongoose';

export class CreateTaskDto {
  readonly title: string;
  readonly description?: string;
  readonly dueDate?: Date;
  readonly status?: string;
  readonly assignee?: Types.ObjectId;
  readonly project: Types.ObjectId;
  readonly tags?: Types.ObjectId[];
  readonly priority?: string;
  readonly attachments?: string[];
}