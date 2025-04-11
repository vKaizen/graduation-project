/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
  ) {}

  async createProject(
    createProjectDto: CreateProjectDto,
    authUser?: AuthUser,
  ): Promise<Project> {
    const { name, description, color, status, ownerId, teamId } =
      createProjectDto;

    // Validate ownerId
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }

    // Validate teamId if provided
    if (teamId && !Types.ObjectId.isValid(teamId)) {
      throw new BadRequestException('Invalid team ID');
    }

    // Build a new Project instance
    const project = new this.projectModel({
      name,
      description,
      color,
      status: status || 'on-track', // Set default status if not provided
      teamId: teamId ? new Types.ObjectId(teamId) : undefined,
      roles: [{ userId: new Types.ObjectId(ownerId), role: 'Owner' }],
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
    if (!Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return [];
    }

    // Log the query we're about to execute
    console.log('Executing query with filter:', {
      'roles.userId': new Types.ObjectId(userId),
    });

    // Find all projects to see what's in the database
    const allProjects = await this.projectModel.find({}).exec();
    console.log(
      'All projects in database:',
      JSON.stringify(allProjects, null, 2),
    );

    const projects = await this.projectModel
      .find({
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

    console.log(
      'Final filtered projects:',
      JSON.stringify(filteredProjects, null, 2),
    );
    return filteredProjects;
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

    // Log project roles for debugging
    console.log('Project roles:', project.roles);

    // Then check if the user has access
    const hasAccess = project.roles.some((role) => {
      const roleUserId = role.userId.toString();
      console.log(
        'Comparing role userId:',
        roleUserId,
        'with request userId:',
        userId,
      );
      return roleUserId === userId;
    });

    console.log('Access check result:', hasAccess);

    if (!hasAccess) {
      throw new NotFoundException(`User does not have access to project ${id}`);
    }

    console.log('Raw project data:', {
      id: project._id,
      sectionsCount: project.sections?.length || 0,
      sectionsData: JSON.stringify(project.sections, null, 2),
    });

    // Filter out any null sections
    project.sections = project.sections.filter((section) => section !== null);

    return project;
  }

  async addMember(
    projectId: string,
    addMemberDto: AddMemberDto,
  ): Promise<Project> {
    const { userId, role } = addMemberDto;

    // Validate projectId
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Validate userId
    if (!Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    // Step 1: Attempt to push if userId doesn't exist in roles
    const updatedProject = await this.projectModel.findOneAndUpdate(
      {
        _id: projectId,
        'roles.userId': { $ne: new Types.ObjectId(userId) },
      },
      {
        $push: {
          roles: {
            userId: new Types.ObjectId(userId),
            role,
          },
        },
      },
      { new: true },
    );

    if (!updatedProject) {
      const projectWithUpdatedRole = await this.projectModel.findOneAndUpdate(
        {
          _id: projectId,
          'roles.userId': new Types.ObjectId(userId),
        },
        {
          $set: {
            'roles.$.role': role,
          },
        },
        { new: true },
      );

      if (!projectWithUpdatedRole) {
        throw new NotFoundException('Project not found');
      }

      return projectWithUpdatedRole;
    }

    return updatedProject;
  }

  async updateProjectStatus(
    projectId: string,
    updateProjectStatusDto: UpdateProjectStatusDto,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const updatedProject = await this.projectModel.findByIdAndUpdate(
      projectId,
      { status: updateProjectStatusDto.status },
      { new: true },
    );

    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }

    // Log the status update
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: `Changed project status to ${updateProjectStatusDto.status}`,
      user: authUser,
    });

    return updatedProject;
  }

  async updateProjectDescription(
    projectId: string,
    description: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    const updatedProject = await this.projectModel.findByIdAndUpdate(
      projectId,
      { description },
      { new: true },
    );

    if (!updatedProject) {
      throw new NotFoundException('Project not found');
    }

    // Log the description update
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: 'Updated project description',
      user: authUser,
    });

    return updatedProject;
  }

  async getProjectActivities(projectId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Use the activity logs service to get real logs
    return this.activityLogsService.getLogsByProjectId(projectId);
  }
}
