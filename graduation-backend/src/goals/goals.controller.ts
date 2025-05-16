/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Goal } from './schema/goal.schema';

@Controller('goals')
@UseGuards(JwtAuthGuard)
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  create(@Body() createGoalDto: CreateGoalDto) {
    return this.goalsService.create(createGoalDto);
  }

  @Get()
  findAll(
    @Query('ownerId') ownerId?: string,
    @Query('workspaceId') workspaceId?: string,
    @Query('status') status?: string,
    @Query('timeframe') timeframe?: string,
    @Query('timeframeYear') timeframeYear?: string,
    @Query('isPrivate') isPrivate?: string,
    @Request() req?: any,
  ) {
    console.log('GET /goals with filters:', {
      ownerId,
      workspaceId,
      status,
      timeframe,
      timeframeYear,
      isPrivate,
    });
    console.log(
      'Authentication info:',
      req?.user ? 'Authenticated' : 'Not authenticated',
    );
    if (req?.user) {
      console.log('Authenticated user ID:', req.user.userId);
    }

    const filters: any = {};

    if (ownerId) filters.ownerId = ownerId;
    if (workspaceId) filters.workspaceId = workspaceId;
    if (status) filters.status = status.split(',');
    if (timeframe) filters.timeframe = timeframe;
    if (timeframeYear) filters.timeframeYear = parseInt(timeframeYear, 10);
    if (isPrivate !== undefined) {
      // Convert string 'true'/'false' to boolean
      filters.isPrivate = isPrivate === 'true';
      console.log('isPrivate filter set to:', filters.isPrivate);

      // If fetching private goals, include the current user ID
      // This is used to find goals where the user is either the owner or a member
      if (filters.isPrivate === true && req?.user?.userId) {
        filters.userId = req.user.userId;
        console.log('Adding userId filter for private goals:', filters.userId);
      } else if (filters.isPrivate === true) {
        console.log(
          'WARNING: Fetching private goals but no user ID available in request!',
        );
      }
    }

    console.log('Final filters for goals query:', filters);
    return this.goalsService.findAll(filters);
  }

  @Get('hierarchy')
  async getHierarchy(
    @Query('workspaceId') workspaceId?: string,
    @Query('isPrivate') isPrivate?: string,
    @Request() req?: any,
  ): Promise<Goal[]> {
    console.log('GET /goals/hierarchy with workspaceId:', workspaceId);
    console.log('GET /goals/hierarchy with isPrivate:', isPrivate);

    // Log authentication info
    console.log(
      'Request user:',
      req?.user ? 'Authenticated' : 'Not authenticated',
    );
    if (req?.user) {
      console.log('User ID:', req.user.userId);
    }

    try {
      // Convert string 'true'/'false' to boolean if provided
      let isPrivateBoolean: boolean | undefined = undefined;
      if (isPrivate !== undefined) {
        isPrivateBoolean = isPrivate === 'true';
      }

      const hierarchy = await this.goalsService.getHierarchy({
        workspaceId,
        isPrivate: isPrivateBoolean,
      });

      console.log(
        `Hierarchy API response: returning ${hierarchy?.length || 0} goals`,
      );
      if (hierarchy.length > 0) {
        console.log('First goal ID:', hierarchy[0]._id);
        console.log('First goal has children:', !!hierarchy[0].children);
        if (hierarchy[0].children) {
          console.log('Children count:', hierarchy[0].children.length);
        }
      }

      return hierarchy;
    } catch (error) {
      console.error('Error in getHierarchy controller:', error);
      throw error;
    }
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.goalsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGoalDto: UpdateGoalDto) {
    return this.goalsService.update(id, updateGoalDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.goalsService.remove(id);
  }

  @Post(':id/link-task/:taskId')
  linkTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.goalsService.linkTaskToGoal(id, taskId);
  }

  @Delete(':id/unlink-task/:taskId')
  unlinkTask(@Param('id') id: string, @Param('taskId') taskId: string) {
    return this.goalsService.unlinkTaskFromGoal(id, taskId);
  }

  @Get(':id/calculate-progress')
  calculateProgress(@Param('id') id: string) {
    return this.goalsService.calculateGoalProgress(id);
  }

  @Get('by-timeframe/:timeframe')
  getByTimeframe(
    @Param('timeframe') timeframe: string,
    @Query('year') year?: string,
    @Query('ownerId') ownerId?: string,
    @Query('workspaceId') workspaceId?: string,
  ) {
    const filters: any = { timeframe };

    if (year) filters.timeframeYear = parseInt(year, 10);
    if (ownerId) filters.ownerId = ownerId;
    if (workspaceId) filters.workspaceId = workspaceId;

    return this.goalsService.findAll(filters);
  }
}
