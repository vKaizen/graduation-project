/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsMongoId, IsOptional, IsNumber } from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsMongoId()
  @IsNotEmpty()
  project: string;

  @IsMongoId()
  @IsNotEmpty()
  section: string;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsMongoId()
  @IsOptional()
  assignee?: string;

  @IsString()
  @IsOptional()
  dueDate?: string;

  @IsString()
  @IsOptional()
  priority?: string;
}