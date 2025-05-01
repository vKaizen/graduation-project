/* eslint-disable prettier/prettier */
import {
  IsNotEmpty,
  IsString,
  IsMongoId,
  IsOptional,
  IsEnum,
  IsArray,
} from 'class-validator';
import { InviteStatus } from '../schema/invites.schema';

export class CreateInviteDto {
  @IsNotEmpty()
  @IsMongoId()
  readonly inviteeId: string;

  @IsNotEmpty()
  @IsMongoId()
  readonly workspaceId: string;

  @IsOptional()
  @IsArray()
  readonly selectedProjects?: string[];
}

export class AcceptInviteDto {
  @IsNotEmpty()
  @IsString()
  readonly inviteToken: string;
}

export class UpdateInviteStatusDto {
  @IsNotEmpty()
  @IsEnum(['pending', 'accepted', 'expired', 'revoked'])
  readonly status: InviteStatus;
}

export class InviteResponseDto {
  id: string;
  inviterId: string;
  inviterName?: string;
  inviteeId: string;
  inviteeName?: string;
  workspaceId: string;
  workspaceName?: string;
  status: InviteStatus;
  inviteTime: Date;
  expirationTime: Date;
  inviteToken: string;
}
