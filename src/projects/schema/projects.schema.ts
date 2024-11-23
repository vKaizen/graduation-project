/* eslint-disable prettier/prettier */
// src/projects/schemas/project.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: 'active' })
  status: string;  // e.g., active, completed, paused

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
  members: Types.ObjectId[];  // References to User documents

  @Prop({ type: Types.ObjectId, ref: 'Team' })
  team: Types.ObjectId;  // Reference to a Team document

  @Prop({ type: Map, of: String })
  customFields: Map<string, string>;  // Custom key-value pairs
}

export const ProjectSchema = SchemaFactory.createForClass(Project);
