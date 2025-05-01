/* eslint-disable prettier/prettier */

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Comment extends Document {
  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;  // The user who created the comment
  
  @Prop({ type: String })
  authorName: string;  // The name of the user who created the comment

  @Prop({ type: Types.ObjectId, ref: 'Task' })
  task: Types.ObjectId;  // The task to which this comment belongs
}

export const CommentSchema = SchemaFactory.createForClass(Comment);