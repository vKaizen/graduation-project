/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Patch,
  Get,
  Body,
  Param,
  Headers,
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

  @Post('create')
  async createProject(
    @Body() createProjectDto: CreateProjectDto,
    @Headers('Authorization') auth: string,
  ) {
    const token = auth.split(' ')[1];
    const userData = await this.authService.decodeToken(token);
    const ownerId = userData.sub;
    createProjectDto.ownerId = ownerId;

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

  @Patch(':id/members')
  async addMemberToProject(
    @Param('id') projectId: string,
    @Body() addMemberDto: AddMemberDto,
  ): Promise<Project> {
    return this.projectsService.addMember(projectId, addMemberDto);
  }

  @Patch(':id/status')
  async updateProjectStatus(
    @Param('id') projectId: string,
    @Body() updateProjectStatusDto: UpdateProjectStatusDto,
  ): Promise<Project> {
    return this.projectsService.updateProjectStatus(
      projectId,
      updateProjectStatusDto,
    );
  }
}
