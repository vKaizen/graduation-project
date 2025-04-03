/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Delete,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './schema/tasks.schema';
import { UpdateTaskDto } from './dto/updateTask.dto';

@Controller('tasks')
export class TasksController {
  private readonly logger = new Logger(TasksController.name);
  
  constructor(private tasksService: TasksService) {}

  @Post()  // Changed from 'new' to match frontend
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    this.logger.log(`Creating new task with title: ${createTaskDto.title}`);
    return this.tasksService.createTask(createTaskDto);
  }

  @Get(':id')
  async getTaskById(@Param('id') id: string): Promise<Task> {
    const task = await this.tasksService.getTaskById(id);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.updateTask(id, updateTaskDto);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    const task = await this.tasksService.deleteTask(id);
    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return task;
  }

  @Get('project/:projectId')
  async getTasksByProject(@Param('projectId') projectId: string) {
    return this.tasksService.findTasksByProject(projectId);
  }

  @Get('section/:sectionId')
  async getTasksBySection(@Param('sectionId') sectionId: string) {
    return this.tasksService.getTasksBySection(sectionId);
  }

  // New endpoints to match frontend expectations
  @Patch(':taskId/move')
  async moveTask(
    @Param('taskId') taskId: string,
    @Body() moveData: { section: string; order: number },
  ) {
    if (!moveData.section || moveData.order === undefined) {
      throw new BadRequestException('Section ID and order are required');
    }
    return this.tasksService.moveTask(taskId, moveData.section, moveData.order);
  }

  @Patch('reorder/:sectionId')
  async reorderTasks(
    @Param('sectionId') sectionId: string,
    @Body() reorderData: { taskIds: string[] },
  ) {
    if (!reorderData.taskIds || !reorderData.taskIds.length) {
      throw new BadRequestException('Task IDs array is required');
    }
    return this.tasksService.reorderTasks(sectionId, reorderData.taskIds);
  }
}