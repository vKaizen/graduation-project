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

  @Prop({
    enum: ['not started', 'in progress', 'completed'],
    default: 'not started',
  })
  status: string;

  @Prop({ type: Boolean, default: false })
  completed: boolean;

  @Prop({ type: Date, default: null })
  completedAt: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  assignee: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Task' }] })
  subtasks: Types.ObjectId[];

  @Prop({ type: Types.ObjectId, ref: 'Project', required: false })
  project: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Section', required: false })
  section: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Tag' }] })
  tags: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Comment' }] })
  comments: Types.ObjectId[];

  @Prop()
  priority: string;

  @Prop({ type: [{ type: String }] })
  attachments: string[];

  @Prop({ type: Number, default: 0 })
  order: number;

  @Prop({ type: Boolean, default: false })
  isPersonalTask: boolean;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  updatedBy: Types.ObjectId;

  @Prop({ type: String })
  updatedByName: string;
}

export const TaskSchema = SchemaFactory.createForClass(Task);

// Add pre-update middleware
TaskSchema.pre('findOneAndUpdate', function () {
  const update = this.getUpdate() as any;
  if (update.status === 'completed') {
    update.completed = true;
    update.completedAt = new Date();
    this.set(update);
  } else if (update.status && update.status !== 'completed') {
    // If changing from completed to another status
    update.completed = false;
    update.completedAt = null;
    this.set(update);
  }
});
