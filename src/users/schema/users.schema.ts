/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  fullName: string;  // User's full name, reflecting Asana's user profile structure

  @Prop({ required: true, unique: true })
  email: string;  // Email address for login and notifications

  @Prop()
  profilePictureUrl: string;  // URL of the user's profile picture

  @Prop()
  jobTitle: string;  // Job title, important in professional contexts

  @Prop()
  departmentOrTeam: string;  // Department or team name, aligns with organizational structures

  @Prop()
  role: string;  // Role in the application, e.g., Admin, Member, Guest

  @Prop()
  bio: string;  // About me section, providing a personal description or bio

}

export const UserSchema = SchemaFactory.createForClass(User);