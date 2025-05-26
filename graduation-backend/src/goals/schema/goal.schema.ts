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
export type GoalProgressResource = 'projects' | 'tasks' | 'none';

export interface GoalDocument extends Document {
  title: string;
  description: string;
  progress: number;
  parentGoalId: string;
  ownerId: string;
  owner: any;
  linkedTasks: string[] | any[];
  status: GoalStatus;
  isPrivate: boolean;
  timeframe: GoalTimeframe;
  timeframeYear: number;
  startDate: Date;
  dueDate: Date;
  projects: string[] | any[];
  workspaceId: string;
  workspace: any;
  members: string[];
  children?: GoalDocument[];
  progressResource: GoalProgressResource;
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
  linkedTasks: MongooseSchema.Types.ObjectId[] | string[];

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
  projects: MongooseSchema.Types.ObjectId[] | string[];

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Workspace' })
  workspaceId: string;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }] })
  members: string[];

  @Prop({
    type: String,
    enum: ['projects', 'tasks', 'none'],
    default: 'none',
  })
  progressResource: GoalProgressResource;

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
  // Log members array for debugging
  console.log('Pre-save middleware for Goal');
  console.log('Goal ID:', this._id);
  console.log('Members array:', this.members);
  console.log('Members array length:', this.members ? this.members.length : 0);

  // If this goal has progress manually set, don't auto-calculate
  if (this.isModified('progress')) {
    return next();
  }

  // If has linked tasks, calculate from tasks
  // This would be implemented in a real system

  next();
});
