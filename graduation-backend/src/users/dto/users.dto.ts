/* eslint-disable prettier/prettier */
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

 
  @IsOptional()
  profilePictureUrl?: string;

  @IsOptional()
  jobTitle?: string;

  @IsOptional()
  departmentOrTeam?: string;

  @IsOptional()
  bio?: string;
}
