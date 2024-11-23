/* eslint-disable prettier/prettier */


import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { CreateTaskDto } from './dto/tasks.dto';

@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }

  async findAllTasks(): Promise<Task[]> {
    return this.taskModel.find().populate('assignee').populate('subtasks').populate('tags').exec();
  }

  async getTaskById(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }
  
}