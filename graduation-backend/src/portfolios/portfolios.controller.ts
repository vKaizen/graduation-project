/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Put,
  Req,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { PortfoliosService } from './portfolios.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CreatePortfolioDto,
  UpdatePortfolioDto,
  AddProjectDto,
} from './dto/portfolios.dto';

@Controller('portfolios')
@UseGuards(JwtAuthGuard)
export class PortfoliosController {
  constructor(private readonly portfoliosService: PortfoliosService) {}

  @Get()
  async findAll(@Query('workspaceId') workspaceId: string) {
    return this.portfoliosService.findAll(workspaceId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.portfoliosService.findById(id);
  }

  @Post()
  async create(@Body() createPortfolioDto: CreatePortfolioDto, @Req() req) {
    // Get the user ID from the request (set by JwtAuthGuard)
    const userId = req.user.userId;
    return this.portfoliosService.create(createPortfolioDto, userId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updatePortfolioDto: UpdatePortfolioDto,
  ) {
    return this.portfoliosService.update(id, updatePortfolioDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.portfoliosService.remove(id);
  }

  @Post(':id/projects')
  async addProject(
    @Param('id') id: string,
    @Body() addProjectDto: AddProjectDto,
  ) {
    return this.portfoliosService.addProject(id, addProjectDto.projectId);
  }

  @Delete(':id/projects/:projectId')
  async removeProject(
    @Param('id') id: string,
    @Param('projectId') projectId: string,
  ) {
    return this.portfoliosService.removeProject(id, projectId);
  }

  @Get(':id/metrics')
  async calculateMetrics(@Param('id') id: string) {
    return this.portfoliosService.calculateMetrics(id);
  }
}
