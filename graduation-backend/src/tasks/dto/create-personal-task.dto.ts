/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsMongoId, IsOptional } from 'class-validator';

export class CreatePersonalTaskDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

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