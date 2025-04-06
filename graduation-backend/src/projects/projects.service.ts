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

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
  ) {}

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    const { name, description, color, status, ownerId } = createProjectDto;

    // Validate ownerId
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }

    // Build a new Project instance
    const project = new this.projectModel({
      name,
      description,
      color,
      status,
      roles: [{ userId: new Types.ObjectId(ownerId), role: 'Owner' }],
    });

    return project.save();
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

    return updatedProject;
  }
}
