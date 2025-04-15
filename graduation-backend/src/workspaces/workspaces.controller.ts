/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Patch,
  Delete,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspaces.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Workspace } from './schema/workspaces.schema';
import { Task } from '../tasks/schema/tasks.schema';
import { Project } from '../projects/schema/projects.schema';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspacesService: WorkspacesService) {}

  @Get()
  async findAll(@Request() req): Promise<Workspace[]> {
    // Get all workspaces for the current user
    return this.workspacesService.findAll(req.user.userId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req): Promise<Workspace> {
    // Get a workspace by ID (only if user has access)
    return this.workspacesService.findById(id, req.user.userId);
  }

  @Post()
  async create(
    @Body() createWorkspaceDto: CreateWorkspaceDto,
    @Request() req,
  ): Promise<Workspace> {
    // Create a new workspace with the current user as owner
    return this.workspacesService.create(createWorkspaceDto, req.user.userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
    @Request() req,
  ): Promise<Workspace> {
    // Update a workspace (only if user is the owner)
    return this.workspacesService.update(
      id,
      updateWorkspaceDto,
      req.user.userId,
    );
  }

  @Get(':id/projects')
  async getProjects(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Project[]> {
    // Get all projects within a workspace
    return this.workspacesService.getWorkspaceProjects(id, req.user.userId);
  }

  @Get(':id/tasks')
  async getTasks(@Param('id') id: string, @Request() req): Promise<Task[]> {
    // Get all tasks within projects in a workspace
    return this.workspacesService.getWorkspaceTasks(id, req.user.userId);
  }

  @Patch(':id/members/:memberId')
  async addMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ): Promise<Workspace> {
    // Add a member to a workspace (only if user is the owner)
    return this.workspacesService.addMember(id, memberId, req.user.userId);
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ): Promise<Workspace> {
    // Remove a member from a workspace (only if user is the owner)
    return this.workspacesService.removeMember(id, memberId, req.user.userId);
  }
}
