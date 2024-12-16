/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class Team extends Document {
    @Prop({ required: true })
    name: string;

    @Prop()
    description?: string;  // Optional description for the team

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }] })
    members: Types.ObjectId[];  // Array of user IDs who are members of the team

    @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
    leader: Types.ObjectId[];  // Optional array of user IDs who are leaders of the team

    @Prop()
    privacy?: string;  // Optional privacy setting, e.g., 'public', 'private'
}

export const TeamSchema = SchemaFactory.createForClass(Team);
