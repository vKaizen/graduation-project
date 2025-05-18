/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsIn,
  IsMongoId,
} from 'class-validator';

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
  @IsIn(['on-track', 'at-risk', 'off-track', 'completed'], {
    message: 'Status must be on-track, at-risk, off-track, or completed',
  })
  status?: string;

  @IsString()
  @IsOptional()
  @IsIn(['public', 'invite-only'], {
    message: 'Visibility must be either public or invite-only',
  })
  visibility?: string;

  @IsMongoId()
  @IsNotEmpty()
  workspaceId: string;
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

  @IsString()
  @IsOptional()
  userName?: string;
}

export class UpdateProjectStatusDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['on-track', 'at-risk', 'off-track', 'completed'], {
    message: 'Status must be on-track, at-risk, off-track, or completed',
  })
  status: string;
}

export class UpdateProjectDescriptionDto {
  @IsString()
  @IsNotEmpty()
  description: string;
}

export class UpdateProjectVisibilityDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['public', 'invite-only'], {
    message: 'Visibility must be either public or invite-only',
  })
  visibility: string;
}
