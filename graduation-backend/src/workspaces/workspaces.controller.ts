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
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from './dto/workspaces.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Workspace, WorkspaceRole } from './schema/workspaces.schema';
import { Task } from '../tasks/schema/tasks.schema';
import { Project } from '../projects/schema/projects.schema';
import { Types } from 'mongoose';

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

  @Get(':id/role')
  async getUserRole(
    @Param('id') id: string,
    @Request() req,
  ): Promise<{ role: WorkspaceRole | null }> {
    // Get the user's role in a workspace
    const role = await this.workspacesService.getUserRole(id, req.user.userId);
    return { role };
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
    // Update a workspace (only if user has permission)
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

  @Post(':id/members')
  async addMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req,
  ): Promise<Workspace> {
    // Add a member to a workspace with a specific role
    return this.workspacesService.addMember(id, addMemberDto, req.user.userId);
  }

  @Patch(':id/members/:memberId/role')
  async updateMemberRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() updateRoleDto: UpdateMemberRoleDto,
    @Request() req,
  ): Promise<Workspace> {
    // Update a member's role in a workspace
    return this.workspacesService.updateMemberRole(
      id,
      memberId,
      updateRoleDto,
      req.user.userId,
    );
  }

  @Delete(':id/members/:memberId')
  async removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Request() req,
  ): Promise<Workspace> {
    // Remove a member from a workspace (if user has permission)
    return this.workspacesService.removeMember(id, memberId, req.user.userId);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    // Delete a workspace (only if user is the owner)
    return this.workspacesService.remove(id, req.user.userId);
  }

  @Get(':id/debug')
  async debugWorkspace(@Param('id') id: string, @Request() req) {
    console.log(`Debug workspace ${id} request received`);
    const workspace = await this.workspacesService.findById(
      id,
      req.user.userId,
      true, // Skip access check for debugging
    );

    console.log('Workspace details:', {
      id: workspace._id,
      name: workspace.name,
      owner: workspace.owner,
      members: workspace.members,
    });

    // Check if owner is in the members array
    const ownerId = workspace.owner.toString();
    let ownerInMembers = false;

    if (Array.isArray(workspace.members)) {
      if (workspace.members.length > 0) {
        if (
          typeof workspace.members[0] === 'object' &&
          workspace.members[0].userId
        ) {
          // New structure
          ownerInMembers = workspace.members.some(
            (m) => m.userId.toString() === ownerId && m.role === 'owner',
          );
        } else {
          // Old structure
          ownerInMembers = workspace.members.some((m) => {
            if (typeof m === 'string' || m instanceof Types.ObjectId) {
              return m.toString() === ownerId;
            } else if (m && typeof m === 'object' && 'userId' in m) {
              return m.userId.toString() === ownerId;
            }
            return false;
          });
        }
      }
    }

    console.log(`Owner in members: ${ownerInMembers}`);

    // If owner is not in members, add them
    if (!ownerInMembers) {
      console.log('Adding owner to members array');
      const updatedWorkspace = await this.workspacesService.addMember(
        id,
        { userId: ownerId, role: 'owner' },
        req.user.userId,
      );

      return {
        message: 'Workspace fixed: owner added to members',
        before: {
          members: workspace.members,
        },
        after: {
          members: updatedWorkspace.members,
        },
      };
    }

    return {
      message: 'Workspace is correctly configured',
      details: {
        id: workspace._id,
        name: workspace.name,
        owner: workspace.owner,
        ownerInMembers,
        membersCount: workspace.members.length,
      },
    };
  }
}
