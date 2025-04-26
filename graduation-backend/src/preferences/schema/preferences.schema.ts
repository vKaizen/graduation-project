/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// Define the dashboard card interface for strong typing
export interface DashboardCard {
  id: string;
  type: string;
  position: number;
  visible: boolean;
  title: string;
  fullWidth?: boolean;
}

@Schema({ timestamps: true })
export class Preferences extends Document {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, unique: true })
  userId: Types.ObjectId;

  @Prop({ type: Object, default: {} })
  uiPreferences: {
    backgroundColor?: string;
    dashboardLayout?: DashboardCard[];
    // Add other UI preferences as needed
  };

  @Prop({ type: Object, default: {} })
  notificationPreferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    // Add other notification preferences as needed
  };

  // Add other preference categories as needed
}

export const PreferencesSchema = SchemaFactory.createForClass(Preferences);
