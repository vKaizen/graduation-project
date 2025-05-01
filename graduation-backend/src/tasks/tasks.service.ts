/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task } from './schema/tasks.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/updateTask.dto';
import { Section } from '../sections/schema/sections.schema';
import { CreatePersonalTaskDto } from './dto/create-personal-task.dto';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private taskModel: Model<Task>,
    @InjectModel(Section.name) private sectionModel: Model<Section>,
    private notificationEventsService: NotificationEventsService,
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
    try {
      const originalTask = await this.taskModel.findById(id).exec();
      console.log('Original task:', JSON.stringify(originalTask));
      console.log('Update DTO:', JSON.stringify(updateTaskDto));

      // Capture original assignee for comparison
      const originalAssigneeId = originalTask?.assignee?.toString();
      const wasCompleted = originalTask?.status === 'completed';

      const updatedTask = await this.taskModel
        .findByIdAndUpdate(id, updateTaskDto, { new: true })
        .exec();

      console.log('Updated task:', JSON.stringify(updatedTask));

      // Handle task assignment notification
      if (
        updateTaskDto.assignee &&
        originalAssigneeId !== updateTaskDto.assignee.toString() &&
        updateTaskDto.updatedBy
      ) {
        console.log('Sending task assignment notification');
        console.log(
          `Assignee changed from ${originalAssigneeId} to ${updateTaskDto.assignee.toString()}`,
        );
        console.log(`Updated by: ${updateTaskDto.updatedBy.toString()}`);

        try {
          // Get project details for the notification
          const task = await this.taskModel
            .findById(id)
            .populate('project')
            .exec();
          console.log('Populated task:', JSON.stringify(task));

          if (!task.project) {
            console.error('Project data not found for task:', id);
            return updatedTask;
          }

          const projectName = task.project['name'];
          console.log('Project name:', projectName);

          // Send task assignment notification
          await this.notificationEventsService.onTaskAssigned(
            updateTaskDto.assignee.toString(),
            updateTaskDto.updatedBy.toString(),
            updateTaskDto.updatedByName || 'A team member',
            id,
            updatedTask.title,
            task.project._id.toString(),
            projectName,
          );
          console.log('Task assignment notification sent successfully');
        } catch (error) {
          console.error('Failed to send task assignment notification:', error);
        }
      } else {
        console.log('Conditions for task assignment notification not met:');
        console.log(`Has assignee: ${!!updateTaskDto.assignee}`);
        console.log(
          `Different assignee: ${originalAssigneeId !== (updateTaskDto.assignee?.toString() || 'undefined')}`,
        );
        console.log(`Has updatedBy: ${!!updateTaskDto.updatedBy}`);
      }

      // Handle task completion notification
      if (
        !wasCompleted &&
        updatedTask.status === 'completed' &&
        updatedTask.createdBy &&
        updatedTask.updatedBy
      ) {
        // Only notify if the completer is different from the creator
        if (
          updatedTask.createdBy.toString() !== updatedTask.updatedBy.toString()
        ) {
          // Get project details for the notification
          const task = await this.taskModel
            .findById(id)
            .populate('project')
            .exec();
          const projectName = task.project['name'];

          await this.notificationEventsService.onTaskCompleted(
            updatedTask.createdBy.toString(),
            updatedTask.updatedBy.toString(),
            updatedTask.updatedByName || 'A team member',
            id,
            updatedTask.title,
            task.project._id.toString(),
            projectName,
          );
        }
      }

      return updatedTask;
    } catch (error) {
      console.error('Error in updateTask:', error);
      throw error;
    }
  }

  async deleteTask(id: string): Promise<Task> {
    const session = await this.taskModel.db.startSession();
    session.startTransaction();

    try {
      // Get the task to find its section
      const task = await this.taskModel.findById(id).session(session);
      if (!task) {
        throw new NotFoundException(`Task with ID ${id} not found`);
      }

      // Remove task reference from its section
      if (task.section) {
        const oldSection = await this.sectionModel
          .findById(task.section)
          .session(session);

        if (oldSection) {
          // Filter out the task from the section's tasks array
          oldSection.tasks = oldSection.tasks.filter(
            (t) => t.toString() !== id.toString(),
          );
          await oldSection.save({ session });
        }
      }

      // Delete the task
      const deletedTask = await this.taskModel
        .findByIdAndDelete(id)
        .session(session);

      await session.commitTransaction();
      return deletedTask;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  async findTasksByProject(projectId: string): Promise<Task[]> {
    return this.taskModel.find({ project: projectId }).exec();
  }

  async moveTask(
    taskId: string,
    newSectionId: string,
    newOrder: number,
  ): Promise<Task> {
    const session = await this.taskModel.db.startSession();
    session.startTransaction();

    try {
      // Get the task and its current section
      const task = await this.taskModel.findById(taskId).session(session);
      if (!task) {
        throw new NotFoundException(`Task with ID ${taskId} not found`);
      }

      const oldSectionId = task.section;

      // Remove task from old section if it exists
      if (oldSectionId && oldSectionId.toString() !== newSectionId) {
        const oldSection = await this.sectionModel
          .findById(oldSectionId)
          .session(session);

        if (oldSection) {
          // Filter out the task from the old section's tasks array using toString() comparison
          oldSection.tasks = oldSection.tasks.filter(
            (t) => t.toString() !== taskId,
          );
          await oldSection.save({ session });
        }
      }

      // Add task to new section
      const newSection = await this.sectionModel
        .findById(newSectionId)
        .session(session);

      if (!newSection) {
        throw new NotFoundException(
          `Section with ID ${newSectionId} not found`,
        );
      }

      // Check if task exists in new section using toString() comparison
      const taskExists = newSection.tasks.some((t) => t.toString() === taskId);

      if (!taskExists) {
        // Add task to new section's tasks array
        newSection.tasks = [...newSection.tasks, new Types.ObjectId(taskId)];
        await newSection.save({ session });
      }

      // Update task's section and order
      const updatedTask = await this.taskModel
        .findByIdAndUpdate(
          taskId,
          {
            section: new Types.ObjectId(newSectionId),
            order: newOrder,
          },
          { new: true, session },
        )
        .exec();

      await session.commitTransaction();
      return updatedTask;
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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

  async getMyTasks(userId: string): Promise<Task[]> {
    return this.taskModel
      .find({
        $or: [
          { assignee: userId },
          { createdBy: userId, isPersonalTask: true },
        ],
      })
      .populate('project', 'name color')
      .sort({ dueDate: 1 })
      .exec();
  }

  async createPersonalTask(
    createPersonalTaskDto: CreatePersonalTaskDto,
    userId: string,
  ): Promise<Task> {
    const task = new this.taskModel({
      ...createPersonalTaskDto,
      isPersonalTask: true,
      createdBy: userId,
    });
    return task.save();
  }

  async getTaskPermissions(
    taskId: string,
    userId: string,
  ): Promise<{
    canEdit: boolean;
    canDelete: boolean;
    canUpdateStatus: boolean;
  }> {
    const task = await this.taskModel
      .findById(taskId)
      .populate('project')
      .exec();

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    if (task.isPersonalTask) {
      return {
        canEdit: task.createdBy.toString() === userId,
        canDelete: task.createdBy.toString() === userId,
        canUpdateStatus: true,
      };
    }

    const project = task.project as any;
    const userRole = project?.roles?.find(
      (r) => r.userId.toString() === userId,
    );
    const isOwner = userRole?.role === 'Owner';

    return {
      canEdit: isOwner,
      canDelete: isOwner,
      canUpdateStatus: true,
    };
  }
}
