/* eslint-disable prettier/prettier */


import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { CreateTaskDto } from './dto/tasks.dto';
import { Project } from '../projects/schema/projects.schema';
import { UpdateTaskDto } from './dto/updateTask.dto';



@Injectable()
export class TasksService {
  constructor(@InjectModel(Task.name) private taskModel: Model<Task>, 
  @InjectModel(Project.name) private projectModel: Model<Project>,) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {

    const project = await this.projectModel.findById(createTaskDto.project);
    if(!project){

      throw new NotFoundException(`Project with ID ${createTaskDto.project} not found`);
    }

    const invalidAssignees = createTaskDto.assignee?.filter(
      (assigneeId) => !project.roles.some((role) => role.userId.toString() === assigneeId.toString()),
    );
    if (invalidAssignees && invalidAssignees.length > 0) {
      throw new BadRequestException(
        `The following users are not members of the project: ${invalidAssignees.join(', ')}`,
      );
    }

    const newTask = new this.taskModel(createTaskDto);
    return newTask.save();
  }


  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const updatedTask = await this.taskModel.findByIdAndUpdate(id, updateTaskDto, {
      new: true,
    }).exec();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return updatedTask;
  }


  async deleteTask(id: string): Promise<{ message: string }> {
    const result = await this.taskModel.findByIdAndDelete(id).exec();

    if (!result) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }
    return { message: `Task with ID ${id} has been deleted` };
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