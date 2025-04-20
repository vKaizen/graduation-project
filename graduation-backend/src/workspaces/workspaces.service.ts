/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workspace, WorkspaceRole } from './schema/workspaces.schema';
import {
  CreateWorkspaceDto,
  UpdateWorkspaceDto,
  AddMemberDto,
  UpdateMemberRoleDto,
} from './dto/workspaces.dto';
import { Project } from '../projects/schema/projects.schema';
import { Task } from '../tasks/schema/tasks.schema';

@Injectable()
export class WorkspacesService {
  constructor(
    @InjectModel(Workspace.name) private workspaceModel: Model<Workspace>,
    @InjectModel(Project.name) private projectModel: Model<Project>,
    @InjectModel(Task.name) private taskModel: Model<Task>,
  ) {}

  async findAll(userId: string): Promise<Workspace[]> {
    // Get all workspaces where the user is a member or owner
    return this.workspaceModel
      .find({
        $or: [
          { owner: new Types.ObjectId(userId) },
          { 'members.userId': new Types.ObjectId(userId) },
          { members: new Types.ObjectId(userId) }, // Support for old structure
        ],
      })
      .populate('owner', 'fullName email')
      .populate('members.userId', 'fullName email')
      .exec();
  }

  async findById(
    id: string,
    userId?: string,
    skipAccessCheck = false,
  ): Promise<Workspace> {
    if (!id) {
      throw new BadRequestException('Workspace ID is required');
    }

    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid workspace ID format');
    }

    try {
      const workspace = await this.workspaceModel.findById(id).exec();

      if (!workspace) {
        throw new NotFoundException(`Workspace with ID ${id} not found`);
      }

      // Skip access check if requested (used for system operations)
      if (skipAccessCheck || !userId) {
        return workspace;
      }

      // UPDATED: Handle both string members and object members for backwards compatibility
      const hasMembership = workspace.members.some((member) => {
        // If member is a string (old format)
        if (typeof member === 'string') {
          return member === userId;
        }
        // If member is an object (new format)
        else if (typeof member === 'object' && member !== null) {
          return member.userId?.toString() === userId.toString();
        }
        return false;
      });

      // If the user is the owner or a member, grant access
      if (workspace.owner.toString() === userId.toString() || hasMembership) {
        return workspace;
      }

      throw new ForbiddenException(
        `User ${userId} does not have access to workspace ${id}`,
      );
    } catch (error) {
      // Rethrow NestJS exceptions
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      // Log and throw for unexpected errors
      console.error(`Error finding workspace by ID: ${error.message}`);
      throw new InternalServerErrorException(
        `Failed to fetch workspace: ${error.message}`,
      );
    }
  }

  async getUserRole(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceRole | null> {
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // If user is the owner
    if (workspace.owner.toString() === userId) {
      return 'owner';
    }

    // Handle both old and new member structures for backward compatibility
    if (Array.isArray(workspace.members)) {
      if (workspace.members.length > 0) {
        if (
          typeof workspace.members[0] === 'object' &&
          workspace.members[0].userId
        ) {
          // New structure: array of objects with userId and role
          const member = workspace.members.find(
            (m) => m.userId.toString() === userId,
          );
          return member ? member.role : null;
        } else {
          // Old structure: array of user IDs
          const isMember = workspace.members.some((m) => {
            if (typeof m === 'string' || m instanceof Types.ObjectId) {
              return m.toString() === userId;
            } else if (m && typeof m === 'object' && 'userId' in m) {
              return m.userId.toString() === userId;
            }
            return false;
          });
          // If using old structure and user is a member, treat them as a regular member
          return isMember ? 'member' : null;
        }
      }
    }

    return null;
  }

  async checkPermission(
    workspaceId: string,
    userId: string,
    requiredRoles: WorkspaceRole[],
  ): Promise<boolean> {
    const userRole = await this.getUserRole(workspaceId, userId);

    if (!userRole) {
      return false;
    }

    return requiredRoles.includes(userRole);
  }

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    // Create a new workspace with the current user as owner
    const workspace = new this.workspaceModel({
      ...createWorkspaceDto,
      owner: new Types.ObjectId(userId),
      // Initialize with owner as a member with "owner" role
      members: [
        {
          userId: new Types.ObjectId(userId),
          role: 'owner',
        },
      ],
    });

    return workspace.save();
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    // Get workspace to check permissions
    const workspace = await this.workspaceModel.findById(id);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Only owner and admin can update workspace
    const hasPermission = await this.checkPermission(id, userId, [
      'owner',
      'admin',
    ]);
    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to update this workspace',
      );
    }

    // If user is admin but not owner, they cannot update ownership or members
    const isOwner = workspace.owner.toString() === userId;
    if (!isOwner && updateWorkspaceDto.members) {
      throw new ForbiddenException(
        'Only the owner can update workspace members',
      );
    }

    // Update workspace with allowed fields
    return this.workspaceModel
      .findByIdAndUpdate(id, updateWorkspaceDto, { new: true })
      .exec();
  }

  async getWorkspaceProjects(
    workspaceId: string,
    userId: string,
    skipAccessCheck = false,
  ): Promise<Project[]> {
    console.log(
      `Getting projects for workspace ${workspaceId} and user ${userId}`,
    );
    try {
      // First, verify the user has access to the workspace
      await this.findById(workspaceId, userId, skipAccessCheck);
      console.log(`User access verified for workspace ${workspaceId}`);

      // Find all projects that belong to this workspace
      const projects = await this.projectModel
        .find({ workspaceId: new Types.ObjectId(workspaceId) })
        .populate('createdBy', 'email fullName')
        .exec();

      console.log(
        `Found ${projects.length} projects for workspace ${workspaceId}`,
      );
      return projects;
    } catch (error) {
      console.error(`Error getting workspace projects: ${error.message}`);
      throw error;
    }
  }

  async getWorkspaceTasks(
    workspaceId: string,
    userId: string,
    skipAccessCheck = false,
  ): Promise<Task[]> {
    // First, verify the user has access to the workspace
    await this.findById(workspaceId, userId, skipAccessCheck);

    // Get all projects in this workspace
    const projects = await this.projectModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .select('_id')
      .exec();

    const projectIds = projects.map((project) => project._id);

    // Find all tasks that belong to these workspace projects
    const tasks = await this.taskModel
      .find({ project: { $in: projectIds } })
      .populate('assignee', 'email fullName')
      .populate('project', 'name color')
      .exec();

    return tasks;
  }

  async addMember(
    workspaceId: string,
    addMemberDto: AddMemberDto,
    userId: string,
  ): Promise<Workspace> {
    const { userId: memberId, role } = addMemberDto;

    // Get workspace to check permissions
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Allow adding owner during initial workspace creation if the user is the owner
    const isOwnerCreation =
      role === 'owner' && workspace.owner.toString() === memberId;

    // Skip permission check if this is the owner creation during initial setup
    if (!isOwnerCreation) {
      // Only the owner and admins can add members
      const hasPermission = await this.checkPermission(workspaceId, userId, [
        'owner',
        'admin',
      ]);
      if (!hasPermission) {
        throw new ForbiddenException(
          'You do not have permission to add members',
        );
      }

      // Admins can only add members with 'member' role
      const isOwner = workspace.owner.toString() === userId;
      if (!isOwner && role === 'admin') {
        throw new ForbiddenException(
          'Only the owner can add members as admins',
        );
      }
    }

    // Check member structure type and handle accordingly
    const isNewStructure =
      Array.isArray(workspace.members) &&
      workspace.members.length > 0 &&
      typeof workspace.members[0] === 'object' &&
      workspace.members[0].userId !== undefined;

    // Check if member is already in the workspace
    let memberExists = false;

    if (isNewStructure) {
      // New structure check
      memberExists = workspace.members.some(
        (m) => m.userId.toString() === memberId,
      );
    } else {
      // Old structure check
      memberExists =
        Array.isArray(workspace.members) &&
        workspace.members.some((m) => {
          if (typeof m === 'string' || m instanceof Types.ObjectId) {
            return m.toString() === memberId;
          } else if (m && typeof m === 'object' && 'userId' in m) {
            return m.userId.toString() === memberId;
          }
          return false;
        });
    }

    // Owner check is the same for both structures
    if (workspace.owner.toString() === memberId) {
      memberExists = true;
    }

    if (memberExists) {
      return workspace; // Member already exists, return as is
    }

    // Add member using the appropriate structure based on what we have
    if (isNewStructure) {
      // Use new structure
      workspace.members.push({
        userId: new Types.ObjectId(memberId),
        role: role,
      });
    } else {
      // For simplicity with backward compatibility, convert to new structure here
      const newMembers = [];

      // First add any existing members (as regular members)
      if (Array.isArray(workspace.members)) {
        for (const existingMemberId of workspace.members) {
          if (existingMemberId) {
            newMembers.push({
              userId: existingMemberId,
              role: 'member',
            });
          }
        }
      }

      // Add the new member with the specified role
      newMembers.push({
        userId: new Types.ObjectId(memberId),
        role: role,
      });

      workspace.members = newMembers;
    }

    return workspace.save();
  }

  async updateMemberRole(
    workspaceId: string,
    memberId: string,
    updateRoleDto: UpdateMemberRoleDto,
    userId: string,
  ): Promise<Workspace> {
    const { role } = updateRoleDto;

    // Get workspace to check permissions
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Only the owner can update member roles
    if (workspace.owner.toString() !== userId) {
      throw new ForbiddenException('Only the owner can update member roles');
    }

    // Cannot update the owner's role
    if (workspace.owner.toString() === memberId) {
      throw new BadRequestException("Cannot update the workspace owner's role");
    }

    // Check if workspace uses the new structure
    const isNewStructure =
      Array.isArray(workspace.members) &&
      workspace.members.length > 0 &&
      typeof workspace.members[0] === 'object' &&
      workspace.members[0].userId !== undefined;

    if (!isNewStructure) {
      // If using old structure, convert to new structure first
      const newMembers = [];

      if (Array.isArray(workspace.members)) {
        for (const existingMemberId of workspace.members) {
          if (existingMemberId) {
            // Set the new role for the target member, default role for others
            const memberRole =
              existingMemberId.toString() === memberId ? role : 'member';
            newMembers.push({
              userId: existingMemberId,
              role: memberRole,
            });
          }
        }
      }

      workspace.members = newMembers;
      return workspace.save();
    }

    // Using new structure, find and update the member's role
    const memberIndex = workspace.members.findIndex(
      (m) => m.userId.toString() === memberId,
    );

    if (memberIndex === -1) {
      throw new NotFoundException(
        `Member with ID ${memberId} not found in workspace`,
      );
    }

    workspace.members[memberIndex].role = role;
    return workspace.save();
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<Workspace> {
    // Get workspace to check permissions
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Only owner and admins can remove members
    const hasPermission = await this.checkPermission(workspaceId, userId, [
      'owner',
      'admin',
    ]);
    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to remove members',
      );
    }

    // Cannot remove the owner
    if (workspace.owner.toString() === memberId) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    // Check if workspace uses the new structure
    const isNewStructure =
      Array.isArray(workspace.members) &&
      workspace.members.length > 0 &&
      typeof workspace.members[0] === 'object' &&
      workspace.members[0].userId !== undefined;

    if (isNewStructure) {
      // New structure handling

      // Get the member to check their role
      const member = workspace.members.find(
        (m) => m.userId.toString() === memberId,
      );

      // If member not found, return the workspace as is
      if (!member) {
        return workspace;
      }

      // Only owner can remove admins
      const isOwner = workspace.owner.toString() === userId;
      if (!isOwner && member.role === 'admin') {
        throw new ForbiddenException('Only the owner can remove admin members');
      }

      // Remove member from workspace
      workspace.members = workspace.members.filter(
        (m) => m.userId.toString() !== memberId,
      );
    } else {
      // Old structure handling
      if (Array.isArray(workspace.members)) {
        // Simply filter out the member using old structure
        workspace.members = workspace.members.filter((m) => {
          if (typeof m === 'string' || m instanceof Types.ObjectId) {
            return m.toString() !== memberId;
          } else if (m && typeof m === 'object' && 'userId' in m) {
            return m.userId.toString() !== memberId;
          }
          return true;
        });
      }
    }

    return workspace.save();
  }

  async remove(id: string, userId: string): Promise<void> {
    // Get workspace to check ownership
    const workspace = await this.workspaceModel.findById(id);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Only the owner can delete the workspace
    if (workspace.owner.toString() !== userId) {
      throw new ForbiddenException('Only the owner can delete the workspace');
    }

    // Delete all projects in the workspace first
    const projects = await this.projectModel.find({
      workspaceId: new Types.ObjectId(id),
    });

    // Delete all tasks in the workspace projects
    for (const project of projects) {
      await this.taskModel.deleteMany({ project: project._id });
    }

    // Delete all projects
    await this.projectModel.deleteMany({ workspaceId: new Types.ObjectId(id) });

    // Finally delete the workspace
    await this.workspaceModel.findByIdAndDelete(id);
  }
}
