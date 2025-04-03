/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/updateTask.dto';
import { Section } from '../sections/schema/sections.schema';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Section.name) private sectionModel: Model<Section>,
  ) {}

  async createTask(createTaskDto: CreateTaskDto): Promise<Task> {
    const session = await this.taskModel.db.startSession();
    session.startTransaction();

    try {
      // Create the task
      const createdTask = new this.taskModel(createTaskDto);
      await createdTask.save({ session });

      // Update the section's tasks array
      await this.sectionModel
        .findByIdAndUpdate(
          createTaskDto.section,
          { $push: { tasks: createdTask._id } },
          { new: true, session },
        )
        .exec();

      await session.commitTransaction();
      return createdTask;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findAll(projectId: string, sectionId?: string): Promise<Task[]> {
    const query: any = { project: projectId };
    if (sectionId) {
      query.section = sectionId;
    }
    return this.taskModel.find(query).exec();
  }

  async getTaskById(id: string): Promise<Task> {
    return this.taskModel.findById(id).exec();
  }

  async updateTask(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    return this.taskModel
      .findByIdAndUpdate(id, updateTaskDto, { new: true })
      .exec();
  }

  async deleteTask(id: string): Promise<Task> {
    return this.taskModel.findByIdAndDelete(id).exec();
  }

  async findTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskModel.find({ project: projectId }).exec();
  }

  async moveTask(
    taskId: string,
    newSectionId: string,
    newOrder: number,
  ): Promise<Task> {
    return this.taskModel
      .findByIdAndUpdate(
        taskId,
        {
          section: newSectionId,
          order: newOrder,
        },
        { new: true },
      )
      .exec();
  }

  async reorderTasks(sectionId: string, taskIds: string[]): Promise<Task[]> {
    const tasks = await this.taskModel.find({ section: sectionId });
    const updatedTasks = await Promise.all(
      taskIds.map(async (taskId, index) => {
        return this.taskModel
          .findByIdAndUpdate(taskId, { order: index }, { new: true })
          .exec();
      }),
    );
    return updatedTasks;
  }

  async getTasksBySection(sectionId: string): Promise<Task[]> {
    return this.taskModel
      .find({ section: sectionId })
      .sort({ order: 1 })
      .exec();
  }
}
