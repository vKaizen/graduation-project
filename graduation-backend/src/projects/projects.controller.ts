/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Headers,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  AddMemberDto,
  UpdateProjectStatusDto,
} from './dto/projects.dto';
import { Project } from './schema/projects.schema';
import { AuthService } from 'src/auth/auth.service';

@Controller('projects')
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Headers('Authorization') auth: string,
  ) {
    try {
      const token = auth?.split(' ')[1];
      let ownerId = null;
      
      if (token) {
        const userData = await this.authService.decodeToken(token);
        ownerId = userData.sub;
        createProjectDto.ownerId = ownerId;
      }

      return this.projectsService.createProject(createProjectDto);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  @Get()
  async findAllProjects(): Promise<Project[]> {
    try {
      const projects = await this.projectsService.findAllProjects();
      return projects;
    } catch (error) {
      console.error('Error fetching all projects:', error);
      throw error;
    }
  }

  @Get(':id')
async getProjectById(@Param('id') id: string): Promise<Project> {
    try {
        if (!id) {
            throw new BadRequestException('Project ID is required');
        }
        return await this.projectsService.getProjectById(id);
    } catch (error) {
        console.error(`Error fetching project ${id}:`, error);
        throw error;
    }
}

  @Patch(':id/members')
  async addMemberToProject(
    @Param('id') projectId: string,
    @Body() addMemberDto: AddMemberDto,
  ): Promise<Project> {
    try {
      return await this.projectsService.addMember(projectId, addMemberDto);
    } catch (error) {
      console.error(`Error adding member to project ${projectId}:`, error);
      throw error;
    }
  }

  @Patch(':id/status')
  async updateProjectStatus(
    @Param('id') projectId: string,
    @Body() updateProjectStatusDto: UpdateProjectStatusDto,
  ): Promise<Project> {
    try {
      return await this.projectsService.updateProjectStatus(
        projectId,
        updateProjectStatusDto,
      );
    } catch (error) {
      console.error(`Error updating project ${projectId} status:`, error);
      throw error;
    }
  }

  
}