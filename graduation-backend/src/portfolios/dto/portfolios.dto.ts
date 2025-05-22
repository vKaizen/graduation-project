/* eslint-disable prettier/prettier */
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsMongoId,
  IsArray,
  IsIn,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreatePortfolioDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsMongoId({ each: true })
  projects: string[];

  @IsMongoId()
  @IsNotEmpty()
  workspaceId: string;
}

export class UpdatePortfolioDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsMongoId({ each: true })
  @IsOptional()
  projects?: string[];

  @IsString()
  @IsOptional()
  @IsIn(['on-track', 'at-risk', 'off-track', 'completed', 'no-status'], {
    message:
      'Status must be on-track, at-risk, off-track, completed, or no-status',
  })
  status?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  @Max(100)
  progress?: number;
}

export class AddProjectDto {
  @IsMongoId()
  @IsNotEmpty()
  projectId: string;
}

export class RemoveProjectDto {
  @IsMongoId()
  @IsNotEmpty()
  projectId: string;
}
