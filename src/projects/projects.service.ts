/* eslint-disable prettier/prettier */


import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schema/projects.schema';
import { CreateProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(Project.name) private projectModel: Model<Project>) {}

  async createProject(createProjectDto: CreateProjectDto, ownerId): Promise<Project> {
    const { name, description, status } = createProjectDto;
  
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }
  
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

  


  
}