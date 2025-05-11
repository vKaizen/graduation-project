import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type GoalStatus =
  | 'on-track'
  | 'at-risk'
  | 'off-track'
  | 'achieved'
  | 'no-status';
export type GoalTimeframe =
  | 'Q1'
  | 'Q2'
  | 'Q3'
  | 'Q4'
  | 'H1'
  | 'H2'
  | 'FY'
  | 'custom';

export interface GoalDocument extends Document {
  title: string;
  description: string;
  progress: number;
  parentGoalId: string;
  ownerId: string;
  owner: any;
  linkedTasks: string[];
  status: GoalStatus;
  isPrivate: boolean;
  timeframe: GoalTimeframe;
  timeframeYear: number;
  startDate: Date;
  dueDate: Date;
  projects: string[];
  workspaceId: string;
  workspace: any;
  children?: GoalDocument[];
}

@Schema({ timestamps: true, toJSON: { virtuals: true } })
export class Goal {
  @Prop({ required: true })
  title: string;

  @Prop()
  description: string;

  @Prop({ default: 0 })
  progress: number;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Goal' })
  parentGoalId: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  ownerId: string;

  // Virtual property for owner
  owner: any;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Task' }] })
  linkedTasks: string[];

  @Prop({
    default: 'no-status',
    enum: ['on-track', 'at-risk', 'off-track', 'achieved', 'no-status'],
  })
  status: GoalStatus;

  @Prop({ default: false })
  isPrivate: boolean;

  @Prop({
    enum: ['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'FY', 'custom'],
    default: 'custom',
  })
  timeframe: GoalTimeframe;

  @Prop()
  timeframeYear: number;

  @Prop()
  startDate: Date;

  @Prop()
  dueDate: Date;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Project' }] })
  projects: string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace' })
  workspaceId: string;

  // Virtual property for workspace
  workspace: any;

  // Non-schema property for children in hierarchy
  children?: Goal[];
}

export const GoalSchema = SchemaFactory.createForClass(Goal);

// Add index for faster querying
GoalSchema.index({ parentGoalId: 1 });
GoalSchema.index({ ownerId: 1 });
GoalSchema.index({ workspaceId: 1 });

// Virtual for owner
GoalSchema.virtual('owner', {
  ref: 'User',
  localField: 'ownerId',
  foreignField: '_id',
  justOne: true,
});

// Virtual for workspace
GoalSchema.virtual('workspace', {
  ref: 'Workspace',
  localField: 'workspaceId',
  foreignField: '_id',
  justOne: true,
});

// Add pre-save middleware to calculate progress based on linked tasks or child goals
GoalSchema.pre('save', async function (next) {
  // If this goal has progress manually set, don't auto-calculate
  if (this.isModified('progress')) {
    return next();
  }

  // If has linked tasks, calculate from tasks
  // This would be implemented in a real system

  next();
});
