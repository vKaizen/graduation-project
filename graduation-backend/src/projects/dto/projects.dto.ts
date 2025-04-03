/* eslint-disable prettier/prettier */
import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsNotEmpty()
  ownerId: string;

  @IsString()
  @IsNotEmpty()
  color: string; // Added required color field

  @IsString()
  @IsOptional()
  @IsIn(['active', 'completed', 'archived'], {
    message: 'Status must be active, completed, or archived',
  })
  status?: string;
}

export class AddMemberDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsIn(['Owner', 'Member', 'Admin'], {
    message: 'Role must be one of Owner, Member, or Admin',
  })
  role: string;
}

export class UpdateProjectStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['active', 'completed', 'archived'], {
    message: 'Status must be active, completed, or archived',
  })
  status: string;
}
