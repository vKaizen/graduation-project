/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

@Schema({ timestamps: true })
export class Invite extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inviterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inviteeId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Workspace', required: true })
  workspaceId: Types.ObjectId;

  @Prop({ type: [Types.ObjectId], ref: 'Project', default: [] })
  selectedProjects: Types.ObjectId[];

  @Prop({ type: String, default: 'member' })
  role: string;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'expired', 'revoked'],
    default: 'pending',
  })
  status: InviteStatus;

  @Prop({ type: Date, default: Date.now })
  inviteTime: Date;

  @Prop({ type: Date, required: true })
  expirationTime: Date;

  @Prop({ type: String, required: true, unique: true })
  inviteToken: string;
}

export const InviteSchema = SchemaFactory.createForClass(Invite);
