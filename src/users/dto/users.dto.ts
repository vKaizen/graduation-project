/* eslint-disable prettier/prettier */
import { IsEmail, IsNotEmpty, IsOptional, IsString, Validate } from 'class-validator';
import { IsValidRoleConstraint } from '../../validators/IsValidRoleConstraint';

export class CreateUserDto {
  @IsNotEmpty()
  @IsString()
  fullName: string;

  @IsEmail()
  email: string;

  @IsNotEmpty()
  password: string;

  @IsNotEmpty()
  @Validate(IsValidRoleConstraint)
  role: string;

  @IsOptional()
  profilePictureUrl?: string;

  @IsOptional()
  jobTitle?: string;

  @IsOptional()
  departmentOrTeam?: string;

  @IsOptional()
  bio?: string;
}
