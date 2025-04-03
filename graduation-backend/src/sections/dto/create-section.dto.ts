/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsMongoId()
  @IsNotEmpty()
  project: string;
}