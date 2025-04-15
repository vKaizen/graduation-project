/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schema/projects.schema';
import {
  CreateProjectDto,
  AddMemberDto,
  UpdateProjectStatusDto,
} from './dto/projects.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { WorkspacesService } from '../workspaces/workspaces.service';

// Interface for authenticated user
interface AuthUser {
  userId: string;
  name: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly activityLogsService: ActivityLogsService,
    private readonly workspacesService: WorkspacesService,
  ) {}

  async createProject(
    createProjectDto: CreateProjectDto,
    authUser?: AuthUser,
  ): Promise<Project> {
    const { name, description, color, status, ownerId, workspaceId } =
      createProjectDto;

    // Validate ownerId
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }

    // Validate workspaceId
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    // Verify that the user has access to the workspace
    try {
      await this.workspacesService.findById(workspaceId, ownerId);
    } catch (error) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Build a new Project instance
    const project = new this.projectModel({
      name,
      description,
      color,
      status: status || 'on-track', // Set default status if not provided
      workspaceId: new Types.ObjectId(workspaceId),
      roles: [{ userId: new Types.ObjectId(ownerId), role: 'Owner' }],
      createdBy: new Types.ObjectId(ownerId),
    });

    const savedProject = await project.save();

    // Log project creation
    await this.activityLogsService.createLog({
      projectId: savedProject._id.toString(),
      type: 'created',
      content: 'Created new project',
      user: authUser,
    });

    return savedProject;
  }

  async findAllProjects(userId: string): Promise<Project[]> {
    console.log('Finding projects for userId:', userId);

    // First, let's check if the userId is valid
    if (!userId || !Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return [];
    }

    // Get all workspaces the user has access to
    const workspaces = await this.workspacesService.findAll(userId);
    const workspaceIds = workspaces.map((workspace) => workspace._id);

    // Find all projects where the user has access and belongs to one of their workspaces
    const projects = await this.projectModel
      .find({
        workspaceId: { $in: workspaceIds },
        'roles.userId': new Types.ObjectId(userId),
      })
      .populate({
        path: 'sections',
        match: { _id: { $exists: true } },
      })
      .exec();

    console.log('Projects found for user:', JSON.stringify(projects, null, 2));

    // Filter out null sections from each project
    const filteredProjects = projects.map((project) => {
      project.sections = project.sections.filter((section) => section !== null);
      return project;
    });

    return filteredProjects;
  }

  async findProjectsByWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<Project[]> {
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    // Verify that the user has access to the workspace
    try {
      await this.workspacesService.findById(workspaceId, userId);
    } catch (error) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Find all projects in the workspace
    const projects = await this.projectModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .populate({
        path: 'sections',
        match: { _id: { $exists: true } },
      })
      .exec();

    // Filter out null sections from each project
    return projects.map((project) => {
      project.sections = project.sections.filter((section) => section !== null);
      return project;
    });
  }

  async getProjectById(id: string, userId: string): Promise<Project> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    console.log('Fetching project with ID:', id, 'for user:', userId);

    // First, let's check if the project exists at all
    const project = await this.projectModel
      .findById(id)
      .populate({
        path: 'sections',
        model: 'Section',
        match: { _id: { $exists: true } },
        populate: {
          path: 'tasks',
          model: 'Task',
          options: { sort: { order: 1 } },
        },
      })
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Verify that the user has access to the workspace that contains this project
    try {
      await this.workspacesService.findById(
        project.workspaceId.toString(),
        userId,
      );
    } catch (error) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    // Also check if the user has access to the project itself
    const hasAccess = project.roles.some((role) => {
      return role.userId.toString() === userId;
    });

    if (!hasAccess) {
      throw new ForbiddenException(
        `User does not have access to project ${id}`,
      );
    }

    // Filter out any null sections
    project.sections = project.sections.filter((section) => section !== null);

    return project;
  }

  async updateProjectStatus(
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    // First, get the project to validate access
    const project = await this.getProjectById(projectId, userId);

    // Update status
    project.status = updateStatusDto.status;
    const updatedProject = await project.save();

    // Log status update
    if (authUser) {
      await this.activityLogsService.createLog({
        projectId,
        type: 'updated',
        content: `Updated project status to ${updateStatusDto.status}`,
        user: authUser,
      });
    }

    return updatedProject;
  }

  async updateProjectDescription(
    projectId: string,
    description: string,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    // First, get the project to validate access
    const project = await this.getProjectById(projectId, userId);

    // Update description
    project.description = description;
    const updatedProject = await project.save();

    // Log description update
    if (authUser) {
      await this.activityLogsService.createLog({
        projectId,
        type: 'updated',
        content: 'Updated project description',
        user: authUser,
      });
    }

    return updatedProject;
  }

  async addProjectMember(
    projectId: string,
    memberData: AddMemberDto,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    // First, get the project to validate access
    const project = await this.getProjectById(projectId, userId);

    // Check if user is already a member
    const existingMember = project.roles.find(
      (role) => role.userId.toString() === memberData.userId,
    );

    if (existingMember) {
      // If user is already a member, just update the role
      existingMember.role = memberData.role;
    } else {
      // Otherwise, add the new member
      project.roles.push({
        userId: new Types.ObjectId(memberData.userId),
        role: memberData.role,
      });
    }

    const updatedProject = await project.save();

    // Log member addition
    if (authUser) {
      await this.activityLogsService.createLog({
        projectId,
        type: 'updated',
        content: `Added or updated member with role ${memberData.role}`,
        user: authUser,
      });
    }

    return updatedProject;
  }

  async getProjectActivities(projectId: string, userId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // First, get the project to validate access
    await this.getProjectById(projectId, userId);

    // Use the activity logs service to get real logs
    return this.activityLogsService.getLogsByProjectId(projectId);
  }
}
