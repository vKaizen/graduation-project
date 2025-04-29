/* eslint-disable prettier/prettier */
import {
  IsMongoId,
  IsObject,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';

class UiPreferencesDto {
  @IsOptional()
  backgroundColor?: string;

  @IsOptional()
  dashboardLayout?: Array<{
    id: string;
    type: string;
    position: number;
    visible: boolean;
    title: string;
    fullWidth?: boolean;
  }>;
}

class NotificationPreferencesDto {
  @IsOptional()
  emailNotifications?: boolean;

  @IsOptional()
  pushNotifications?: boolean;
}

export class PreferencesDto {
  @IsMongoId()
  userId: Types.ObjectId;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UiPreferencesDto)
  uiPreferences?: UiPreferencesDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => NotificationPreferencesDto)
  notificationPreferences?: NotificationPreferencesDto;
}
