/* eslint-disable prettier/prettier */


import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/tasks.dto';
import { Task } from './schema/tasks.schema';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @Post('register')
  async createTask(@Body() createTaskDto: CreateTaskDto): Promise<Task> {
    return this.tasksService.createTask(createTaskDto);
  }

  @Get()
  async findAllTasks(): Promise<Task[]> {
    return this.tasksService.findAllTasks();
  }


  @Get(':id')
async getTaskById(@Param('id') id: string): Promise<Task> {
  return this.tasksService.getTaskById(id);
}
  
}
