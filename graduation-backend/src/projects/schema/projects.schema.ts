/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, type: String })
  color: string;

  @Prop({
    type: String,
    default: 'on-track',
    enum: ['on-track', 'at-risk', 'off-track'],
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  teamId: Types.ObjectId;

  @Prop({ type: [{ type: Object }] })
  roles: {
    userId: Types.ObjectId;
    role: string;
  }[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Section' }], default: [] })
  sections: Types.ObjectId[];
}

// Create and export the schema
export const ProjectSchema = SchemaFactory.createForClass(Project);
