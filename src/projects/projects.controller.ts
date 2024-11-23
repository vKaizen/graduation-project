/* eslint-disable prettier/prettier */


import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/projects.dto';
import { Project } from './schema/projects.schema';

@Controller('projects')
export class ProjectsController {
  constructor(private projectsService: ProjectsService) {}

  @Post()
  async createProject(@Body() createProjectDto: CreateProjectDto): Promise<Project> {
    return this.projectsService.createProject(createProjectDto);
  }

  @Get()
  async findAllProjects(): Promise<Project[]> {
    return this.projectsService.findAllProjects();
  }


  @Get(':id')
async getProjectById(@Param('id') id: string): Promise<Project> {
  return this.projectsService.getProjectById(id);
}
  
}