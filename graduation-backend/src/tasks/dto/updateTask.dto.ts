/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from '../dto/create-task.dto';
import { IsMongoId, IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @IsMongoId()
  @IsOptional()
  updatedBy?: string;

  @IsString()
  @IsOptional()
  updatedByName?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsBoolean()
  @IsOptional()
  completed?: boolean;

  @IsOptional()
  completedAt?: Date | null;
}
