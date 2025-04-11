/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true, collection: 'activitylogs' })
export class ActivityLog extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Project', required: true })
  projectId: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['created', 'updated', 'commented', 'completed'],
    required: true,
  })
  type: 'created' | 'updated' | 'commented' | 'completed';

  @Prop({
    type: {
      userId: { type: Types.ObjectId, ref: 'User' },
      name: { type: String },
    },
    required: true,
  })
  user: { userId: Types.ObjectId; name: string };

  @Prop({ required: true })
  content: string;

  @Prop({ type: Date, default: Date.now })
  timestamp: Date;
}

export const ActivityLogSchema = SchemaFactory.createForClass(ActivityLog);
