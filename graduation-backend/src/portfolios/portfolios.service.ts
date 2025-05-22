/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Portfolio } from './schema/portfolios.schema';
import { CreatePortfolioDto, UpdatePortfolioDto } from './dto/portfolios.dto';

@Injectable()
export class PortfoliosService {
  constructor(
    @InjectModel(Portfolio.name) private portfolioModel: Model<Portfolio>,
  ) {}

  // Get all portfolios for a workspace
  async findAll(workspaceId: string): Promise<Portfolio[]> {
    return this.portfolioModel
      .find({ workspaceId: new Types.ObjectId(workspaceId) })
      .populate('projects')
      .populate('owner', 'fullName email')
      .populate('workspaceId', 'name description')
      .exec();
  }

  // Get portfolio by ID
  async findById(id: string): Promise<Portfolio> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid portfolio ID');
    }

    const portfolio = await this.portfolioModel
      .findById(id)
      .populate('projects')
      .populate('owner', 'fullName email')
      .populate('workspaceId', 'name description')
      .exec();

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }

    return portfolio;
  }

  // Create a new portfolio
  async create(
    createPortfolioDto: CreatePortfolioDto,
    userId: string,
  ): Promise<Portfolio> {
    // Convert string IDs to ObjectIds
    const projectIds = createPortfolioDto.projects.map(
      (id) => new Types.ObjectId(id),
    );

    const createdPortfolio = new this.portfolioModel({
      ...createPortfolioDto,
      projects: projectIds,
      workspaceId: new Types.ObjectId(createPortfolioDto.workspaceId),
      owner: new Types.ObjectId(userId),
      progress: 0, // Initial progress
      status: 'no-status', // Initial status
    });

    const savedPortfolio = await createdPortfolio.save();

    // Calculate initial metrics
    await this.calculateMetrics(savedPortfolio._id.toString());

    return this.findById(savedPortfolio._id.toString());
  }

  // Update a portfolio
  async update(
    id: string,
    updatePortfolioDto: UpdatePortfolioDto,
  ): Promise<Portfolio> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid portfolio ID');
    }

    const updatedData: any = { ...updatePortfolioDto };

    // Convert project IDs to ObjectIds if provided
    if (updatePortfolioDto.projects) {
      updatedData.projects = updatePortfolioDto.projects.map(
        (id) => new Types.ObjectId(id),
      );
    }

    const updatedPortfolio = await this.portfolioModel
      .findByIdAndUpdate(id, updatedData, { new: true })
      .exec();

    if (!updatedPortfolio) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }

    // If no status or progress was provided, recalculate metrics
    if (!updatePortfolioDto.status || !updatePortfolioDto.progress) {
      await this.calculateMetrics(id);
    }

    return this.findById(id);
  }

  // Delete a portfolio
  async remove(id: string): Promise<void> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid portfolio ID');
    }

    const result = await this.portfolioModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Portfolio with ID ${id} not found`);
    }
  }

  // Add a project to a portfolio
  async addProject(portfolioId: string, projectId: string): Promise<Portfolio> {
    if (
      !Types.ObjectId.isValid(portfolioId) ||
      !Types.ObjectId.isValid(projectId)
    ) {
      throw new BadRequestException('Invalid portfolio or project ID');
    }

    const portfolio = await this.portfolioModel.findById(portfolioId).exec();

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    // Check if project already exists in the portfolio
    const projectExists = portfolio.projects.some(
      (p) => p.toString() === projectId,
    );

    if (!projectExists) {
      portfolio.projects.push(new Types.ObjectId(projectId));
      await portfolio.save();

      // Recalculate metrics with the new project
      await this.calculateMetrics(portfolioId);
    }

    return this.findById(portfolioId);
  }

  // Remove a project from a portfolio
  async removeProject(
    portfolioId: string,
    projectId: string,
  ): Promise<Portfolio> {
    if (
      !Types.ObjectId.isValid(portfolioId) ||
      !Types.ObjectId.isValid(projectId)
    ) {
      throw new BadRequestException('Invalid portfolio or project ID');
    }

    const portfolio = await this.portfolioModel.findById(portfolioId).exec();

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    // Remove the project
    portfolio.projects = portfolio.projects.filter(
      (p) => p.toString() !== projectId,
    );

    await portfolio.save();

    // Recalculate metrics after removing the project
    await this.calculateMetrics(portfolioId);

    return this.findById(portfolioId);
  }

  // Calculate portfolio metrics (status and progress)
  async calculateMetrics(
    portfolioId: string,
  ): Promise<{ status: string; progress: number }> {
    if (!Types.ObjectId.isValid(portfolioId)) {
      throw new BadRequestException('Invalid portfolio ID');
    }

    const portfolio = await this.portfolioModel
      .findById(portfolioId)
      .populate('projects')
      .exec();

    if (!portfolio) {
      throw new NotFoundException(`Portfolio with ID ${portfolioId} not found`);
    }

    // Default values
    let status = 'no-status';
    let progress = 0;

    // Check if there are projects
    if (portfolio.projects && portfolio.projects.length > 0) {
      // Calculate progress based on completed projects
      const projectsArray = portfolio.projects as any[];
      const totalProjects = projectsArray.length;
      const completedProjects = projectsArray.filter(
        (p) => p.status === 'completed',
      ).length;

      progress = Math.round((completedProjects / totalProjects) * 100);

      // Determine status based on project statuses
      const statusCounts = {
        completed: 0,
        'on-track': 0,
        'at-risk': 0,
        'off-track': 0,
      };

      projectsArray.forEach((project) => {
        if (project.status && statusCounts[project.status] !== undefined) {
          statusCounts[project.status]++;
        }
      });

      // All projects completed
      if (statusCounts['completed'] === totalProjects) {
        status = 'completed';
      }
      // Any off-track projects
      else if (statusCounts['off-track'] > 0) {
        status = 'off-track';
      }
      // Any at-risk projects
      else if (statusCounts['at-risk'] > 0) {
        status = 'at-risk';
      }
      // Otherwise on-track
      else if (statusCounts['on-track'] > 0) {
        status = 'on-track';
      }
    }

    // Update the portfolio with calculated metrics
    await this.portfolioModel
      .findByIdAndUpdate(portfolioId, { status, progress }, { new: true })
      .exec();

    return { status, progress };
  }
}
