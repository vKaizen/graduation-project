/* eslint-disable prettier/prettier */


import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { CreateTaskDto } from './dto/tasks.dto';
import { Project } from '../projects/schema/projects.schema';



@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>, 
  @InjectModel(Project.name) private projectModel: Model<Project>,) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {

    const project = await this.projectModel.findById(createTaskDto.project);
    if(!project){

      throw new NotFoundException(`Project with ID ${createTaskDto.project} not found`);
    }

    const invalidAssignees = createTaskDto.assignee.filter(
      (assigneeId) => !project.members.includes(assigneeId),
    );
    if (invalidAssignees.length > 0) {
      throw new BadRequestException(
        `The following users are not members of the project: ${invalidAssignees.join(', ')}`,
      );
    }

    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }

  async findTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskModel.find({ project: projectId }).populate('assignees').exec();
  }

  async findAllTasks(): Promise<Task[]> {
    return this.taskModel.find().populate('assignee').populate('subtasks').populate('tags').exec();
  }

  async getTaskById(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }
  
}