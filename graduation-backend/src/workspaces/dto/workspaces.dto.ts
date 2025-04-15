/* eslint-disable prettier/prettier */
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
} from 'class-validator';
import { Types } from 'mongoose';

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  readonly members?: Types.ObjectId[];
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  readonly members?: Types.ObjectId[];
}
