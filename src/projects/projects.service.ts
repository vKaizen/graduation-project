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
    const { name, description, status, ownerId } = createProjectDto;

    // Validate ownerId
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }

    // Build a new Project instance
    const project = new this.projectModel({
      name,
      description,
      status,
      roles: [{ userId: new Types.ObjectId(ownerId), role: 'Owner' }],
    });

    return project.save();
  }

  async findAllProjects(): Promise<Project[]> {
    return this.projectModel.find().exec();
  }

  async getProjectById(id: string): Promise<Project> {
    return this.projectModel.findById(id).exec();
  }

  /**
   * Add or update a member within a Project document
   */
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

    // Option 1: If the user might not exist in the roles array yet, and you want to either push or update the role:
    // We'll do a two-step approach:
    //    Step 1: Try to push the new user. If it returns null, it means user is already in array (fails $push w. $ne condition).
    //    Step 2: If user is already in roles, we do a separate update to set the role.

    // Step 1: Attempt to push if userId doesn't exist in roles
    const updatedProject = await this.projectModel.findOneAndUpdate(
      {
        _id: projectId,
        'roles.userId': { $ne: new Types.ObjectId(userId) }, // ensures userId not already in array
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
