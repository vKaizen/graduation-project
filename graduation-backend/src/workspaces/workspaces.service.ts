/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Workspace } from './schema/workspaces.schema';
import { CreateWorkspaceDto, UpdateWorkspaceDto } from './dto/workspaces.dto';
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
          { members: { $in: [new Types.ObjectId(userId)] } },
        ],
      })
      .populate('owner', 'fullName email')
      .exec();
  }

  async findById(id: string, userId: string): Promise<Workspace> {
    // Get a workspace by ID (only if user has access)
    const workspace = await this.workspaceModel
      .findById(id)
      .populate('owner', 'fullName email')
      .exec();

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Check if user has access to this workspace
    const hasAccess =
      workspace.owner.toString() === userId ||
      workspace.members.some((m) => m.toString() === userId);

    if (!hasAccess) {
      throw new UnauthorizedException(
        'You do not have access to this workspace',
      );
    }

    return workspace;
  }

  async create(
    createWorkspaceDto: CreateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    // Create a new workspace with the current user as owner
    const workspace = new this.workspaceModel({
      ...createWorkspaceDto,
      owner: new Types.ObjectId(userId),
      members: [], // Empty members array initially
    });

    return workspace.save();
  }

  async update(
    id: string,
    updateWorkspaceDto: UpdateWorkspaceDto,
    userId: string,
  ): Promise<Workspace> {
    // Get workspace to check ownership
    const workspace = await this.workspaceModel.findById(id);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${id} not found`);
    }

    // Only the owner can update workspace details
    if (workspace.owner.toString() !== userId) {
      throw new ForbiddenException('Only the owner can update the workspace');
    }

    // Update workspace with allowed fields
    return this.workspaceModel
      .findByIdAndUpdate(id, updateWorkspaceDto, { new: true })
      .exec();
  }

  async getWorkspaceProjects(
    workspaceId: string,
    userId: string,
  ): Promise<Project[]> {
    // First, verify the user has access to the workspace
    const workspace = await this.findById(workspaceId, userId);

    // Find all projects that belong to this workspace
    const projects = await this.projectModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .populate('createdBy', 'email fullName')
      .exec();

    return projects;
  }

  async getWorkspaceTasks(
    workspaceId: string,
    userId: string,
  ): Promise<Task[]> {
    // First, verify the user has access to the workspace
    await this.findById(workspaceId, userId);

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
    memberId: string,
    userId: string,
  ): Promise<Workspace> {
    // Get workspace to check ownership
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Only the owner can add members
    if (workspace.owner.toString() !== userId) {
      throw new ForbiddenException('Only the owner can add members');
    }

    // Check if member is already in the workspace
    if (
      workspace.members.some((m) => m.toString() === memberId) ||
      workspace.owner.toString() === memberId
    ) {
      return workspace; // Member already exists, return as is
    }

    // Add member to workspace
    workspace.members.push(new Types.ObjectId(memberId));
    return workspace.save();
  }

  async removeMember(
    workspaceId: string,
    memberId: string,
    userId: string,
  ): Promise<Workspace> {
    // Get workspace to check ownership
    const workspace = await this.workspaceModel.findById(workspaceId);

    if (!workspace) {
      throw new NotFoundException(`Workspace with ID ${workspaceId} not found`);
    }

    // Only the owner can remove members
    if (workspace.owner.toString() !== userId) {
      throw new ForbiddenException('Only the owner can remove members');
    }

    // Cannot remove the owner
    if (workspace.owner.toString() === memberId) {
      throw new ForbiddenException('Cannot remove the workspace owner');
    }

    // Remove member from workspace
    workspace.members = workspace.members.filter(
      (m) => m.toString() !== memberId,
    );
    return workspace.save();
  }
}
