/* eslint-disable prettier/prettier */
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsArray,
  IsMongoId,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Types } from 'mongoose';
import { WorkspaceRole } from '../schema/workspaces.schema';

export class WorkspaceMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  readonly userId: string;

  @IsNotEmpty()
  @IsEnum(['owner', 'admin', 'member'])
  readonly role: WorkspaceRole;
}

export class CreateWorkspaceDto {
  @IsNotEmpty()
  @IsString()
  readonly name: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceMemberDto)
  readonly members?: WorkspaceMemberDto[];
}

export class UpdateWorkspaceDto {
  @IsOptional()
  @IsString()
  readonly name?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkspaceMemberDto)
  readonly members?: WorkspaceMemberDto[];
}

export class AddMemberDto {
  @IsNotEmpty()
  @IsMongoId()
  readonly userId: string;

  @IsNotEmpty()
  @IsEnum(['owner', 'admin', 'member'])
  readonly role: WorkspaceRole;
}

export class UpdateMemberRoleDto {
  @IsNotEmpty()
  @IsEnum(['admin', 'member'])
  readonly role: WorkspaceRole;
}
