import {
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  IsBoolean,
  IsEnum,
  IsArray,
  IsDateString,
} from 'class-validator';
import {
  GoalStatus,
  GoalTimeframe,
  GoalProgressResource,
} from '../schema/goal.schema';

export class CreateGoalDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  progress?: number = 0;

  @IsUUID()
  @IsOptional()
  parentGoalId?: string;

  @IsUUID()
  ownerId: string;

  @IsArray()
  @IsOptional()
  linkedTasks?: string[];

  @IsEnum(['on-track', 'at-risk', 'off-track', 'achieved', 'no-status'])
  @IsOptional()
  status?: GoalStatus = 'no-status';

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean = false;

  @IsEnum(['Q1', 'Q2', 'Q3', 'Q4', 'H1', 'H2', 'FY', 'custom'])
  @IsOptional()
  timeframe?: GoalTimeframe = 'custom';

  @IsNumber()
  @IsOptional()
  timeframeYear?: number;

  @IsDateString()
  @IsOptional()
  startDate?: Date;

  @IsDateString()
  @IsOptional()
  dueDate?: Date;

  @IsArray()
  @IsOptional()
  projects?: string[];

  @IsUUID()
  @IsOptional()
  workspaceId?: string;

  @IsArray()
  @IsOptional()
  members?: string[];

  @IsEnum(['projects', 'tasks', 'none'])
  @IsOptional()
  progressResource?: GoalProgressResource = 'none';
}
