/* eslint-disable prettier/prettier */


import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Project } from './schema/projects.schema';
import { CreateProjectDto } from './dto/projects.dto';

@Injectable()
export class ProjectsService {
  constructor(@InjectModel(Project.name) private projectModel: Model<Project>) {}

  async createProject(createProjectDto: CreateProjectDto): Promise<Project> {
    const newProject = new this.projectModel(createProjectDto);
    return newProject.save();
  }

  async findAllProjects(): Promise<Project[]> {
    return this.projectModel.find().exec();
  }

  async getProjectById(id: string): Promise<Project> {
    return this.projectModel.findById(id).exec();
  }

  


  
}