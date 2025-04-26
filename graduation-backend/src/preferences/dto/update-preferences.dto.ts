/* eslint-disable prettier/prettier */
import {
  IsOptional,
  IsObject,
  IsString,
  IsBoolean,
  IsArray,
} from 'class-validator';

export class UpdateUiPreferencesDto {
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @IsOptional()
  @IsArray()
  dashboardLayout?: string[];
}

export class UpdateNotificationPreferencesDto {
  @IsOptional()
  @IsBoolean()
  emailNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;
}

export class UpdatePreferencesDto {
  @IsOptional()
  @IsObject()
  uiPreferences?: UpdateUiPreferencesDto;

  @IsOptional()
  @IsObject()
  notificationPreferences?: UpdateNotificationPreferencesDto;
}
