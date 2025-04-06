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
  Request,
  UseGuards,
} from '@nestjs/common';
import { ProjectsService } from './projects.service';
import {
  CreateProjectDto,
  AddMemberDto,
  UpdateProjectStatusDto,
} from './dto/projects.dto';
import { Project } from './schema/projects.schema';
import { AuthService } from 'src/auth/auth.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';

@Controller('projects')
@UseGuards(JwtAuthGuard)
export class ProjectsController {
  constructor(
    private projectsService: ProjectsService,
    private readonly authService: AuthService,
  ) {}

  @Post()
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Request() req,
  ) {
    try {
      const ownerId = req.user.userId;
      createProjectDto.ownerId = ownerId;
      return this.projectsService.createProject(createProjectDto);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  @Get()
  async findAllProjects(@Request() req): Promise<Project[]> {
    try {
      console.log('User object from request:', req.user);
      const userId = req.user.userId;
      console.log('Using userId:', userId);
      const projects = await this.projectsService.findAllProjects(userId);
      return projects;
    } catch (error) {
      console.error('Error fetching all projects:', error);
      throw error;
    }
  }

  @Get(':id')
  async getProjectById(
    @Param('id') id: string,
    @Request() req,
  ): Promise<Project> {
    try {
      if (!id) {
        throw new BadRequestException('Project ID is required');
      }
      const userId = req.user.userId;
      console.log('Getting project with ID:', id, 'for user:', userId);
      return await this.projectsService.getProjectById(id, userId);
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
