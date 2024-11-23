/* eslint-disable prettier/prettier */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Task extends Document {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop()
  dueDate: Date;

  @Prop({ enum: ['not started', 'in progress', 'completed'], default: 'not started' })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignee: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }] })
  subtasks: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Project' })
  project: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }] })
  comments: Types.ObjectId[];

  @Prop()
  priority: string;

  @Prop({ type: [{ type: String }] })
  attachments: string[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);