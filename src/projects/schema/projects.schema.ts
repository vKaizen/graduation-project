/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Project extends Document {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: false })
  status: string;

  @Prop([
    {
      userId: { type: Types.ObjectId, ref: 'User', required: true },
      role: { type: String, enum: ['Owner', 'Member', 'Admin'], required: true },
    },
  ])
  roles: { userId: Types.ObjectId; role: string }[];
}


export const ProjectSchema = SchemaFactory.createForClass(Project);
