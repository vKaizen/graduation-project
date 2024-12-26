/* eslint-disable prettier/prettier */


import { Controller, Post, Body, Get, Param, Patch, Delete } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { Task } from './schema/tasks.schema';
import { UpdateTaskDto } from './dto/updateTask.dto';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post('new')
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.createTask(createTaskDto);
  }

  @Patch(':id')
  async updateTask(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
  ) {
    return this.tasksService.updateTask(id, updateTaskDto);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }

  
  @Get(':id')
async getTaskById(@Param('id') id: string): Promise<Task> {
  return this.tasksService.getTaskById(id);
}

@Get('/project/:projectId')
async getTasksByProject(@Param('projectId') projectId: string) {
  return this.tasksService.findTasksByProject(projectId);
}
  
}
