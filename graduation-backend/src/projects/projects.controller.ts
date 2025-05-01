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
  UpdateProjectDescriptionDto,
  UpdateProjectVisibilityDto,
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

      // Pass authenticated user info
      const authUser = {
        userId: req.user.userId,
        name: req.user.username || 'Unknown User',
      };

      return this.projectsService.createProject(createProjectDto, authUser);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  @Get()
  async findAllProjects(@Request() req): Promise<Project[]> {
    try {
      const userId = req.user.userId;
      return await this.projectsService.findAllProjects(userId);
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
      return await this.projectsService.getProjectById(id, req.user.userId);
    } catch (error) {
      console.error(`Error fetching project ${id}:`, error);
      throw error;
    }
  }

  @Patch(':id/status')
  async updateProjectStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateProjectStatusDto,
    @Request() req,
  ): Promise<Project> {
    const authUser = {
      userId: req.user.userId,
      name: req.user.username || 'Unknown User',
    };

    return this.projectsService.updateProjectStatus(
      id,
      updateStatusDto,
      req.user.userId,
      authUser,
    );
  }

  @Patch(':id')
  async updateProjectDescription(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDescriptionDto,
    @Request() req,
  ): Promise<Project> {
    const authUser = {
      userId: req.user.userId,
      name: req.user.username || 'Unknown User',
    };

    return this.projectsService.updateProjectDescription(
      id,
      updateProjectDto.description,
      req.user.userId,
      authUser,
    );
  }

  @Patch(':id/members')
  async addProjectMember(
    @Param('id') id: string,
    @Body() addMemberDto: AddMemberDto,
    @Request() req,
  ): Promise<Project> {
    const authUser = {
      userId: req.user.userId,
      name: req.user.username || 'Unknown User',
    };

    return this.projectsService.addProjectMember(
      id,
      addMemberDto,
      req.user.userId,
      authUser,
    );
  }

  @Get(':id/activities')
  async getProjectActivities(@Param('id') projectId: string, @Request() req) {
    try {
      return await this.projectsService.getProjectActivities(
        projectId,
        req.user.userId,
      );
    } catch (error) {
      console.error(
        `Error fetching activities for project ${projectId}:`,
        error,
      );
      throw error;
    }
  }

  @Patch(':id/visibility')
  async updateProjectVisibility(
    @Param('id') id: string,
    @Body() visibilityDto: UpdateProjectVisibilityDto,
    @Request() req,
  ): Promise<Project> {
    const authUser = {
      userId: req.user.userId,
      name: req.user.username || 'Unknown User',
    };

    return this.projectsService.updateProjectVisibility(
      id,
      visibilityDto,
      req.user.userId,
      authUser,
    );
  }
}

@Controller('workspaces/:workspaceId/projects')
@UseGuards(JwtAuthGuard)
export class WorkspaceProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  async getProjectsByWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Request() req,
  ): Promise<Project[]> {
    return this.projectsService.findProjectsByWorkspace(
      workspaceId,
      req.user.userId,
    );
  }

  @Post()
  async createProjectInWorkspace(
    @Param('workspaceId') workspaceId: string,
    @Body() createProjectDto: CreateProjectDto,
    @Request() req,
  ): Promise<Project> {
    // Ensure the workspaceId from the route is used
    createProjectDto.workspaceId = workspaceId;
    createProjectDto.ownerId = req.user.userId;

    // Pass authenticated user info
    const authUser = {
      userId: req.user.userId,
      name: req.user.username || 'Unknown User',
    };

    return this.projectsService.createProject(createProjectDto, authUser);
  }
}
