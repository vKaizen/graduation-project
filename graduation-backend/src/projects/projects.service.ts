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

  async findAllProjects(): Promise<Project[]> {
    const projects = await this.projectModel
      .find()
      .populate({
        path: 'sections',
        match: { _id: { $exists: true } }
      })
      .exec();

    // Filter out null sections from each project
    return projects.map(project => {
      project.sections = project.sections.filter(section => section !== null);
      return project;
    });
  }

  async getProjectById(id: string): Promise<Project> {
    if (!id || !Types.ObjectId.isValid(id)) {
        throw new BadRequestException('Invalid project ID');
    }

    console.log('Fetching project with ID:', id);

    const project = await this.projectModel
        .findById(id)
        .populate({
            path: 'sections',
            model: 'Section',
            match: { _id: { $exists: true } },
            populate: {
                path: 'tasks',
                model: 'Task',
                options: { sort: { order: 1 } } // Sort tasks by order
            }
        })
        .exec();

    if (!project) {
        throw new NotFoundException(`Project with ID ${id} not found`);
    }

    console.log('Raw project data:', {
        id: project._id,
        sectionsCount: project.sections?.length || 0,
        sectionsData: JSON.stringify(project.sections, null, 2)
    });

    // Filter out any null sections
    project.sections = project.sections.filter(section => section !== null);

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