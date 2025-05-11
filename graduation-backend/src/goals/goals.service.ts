import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Goal, GoalDocument } from './schema/goal.schema';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class GoalsService {
  constructor(@InjectModel(Goal.name) private goalModel: Model<GoalDocument>) {}

  async create(createGoalDto: CreateGoalDto): Promise<GoalDocument> {
    const newGoal = new this.goalModel(createGoalDto);
    return newGoal.save();
  }

  // Add a type cast helper method
  private mapGoalDocument(goal: any): GoalDocument {
    return goal as GoalDocument;
  }

  private mapGoalDocuments(goals: any[]): GoalDocument[] {
    return goals.map((goal) => this.mapGoalDocument(goal));
  }

  async findAll(filters?: {
    ownerId?: string;
    workspaceId?: string;
    status?: string[];
    timeframe?: string;
    timeframeYear?: number;
  }): Promise<GoalDocument[]> {
    let query = this.goalModel.find();

    // Apply filters if provided
    if (filters) {
      if (filters.ownerId) {
        query = query.where('ownerId').equals(filters.ownerId);
      }

      if (filters.workspaceId) {
        query = query.where('workspaceId').equals(filters.workspaceId);
      }

      if (filters.status && filters.status.length > 0) {
        query = query.where('status').in(filters.status);
      }

      if (filters.timeframe) {
        query = query.where('timeframe').equals(filters.timeframe);

        if (filters.timeframeYear) {
          query = query.where('timeframeYear').equals(filters.timeframeYear);
        }
      }
    }

    // Populate owner and convert to plain object for frontend compatibility
    return query
      .populate({
        path: 'ownerId',
        model: 'User',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'workspaceId',
        model: 'Workspace',
        options: { strictPopulate: false },
      })
      .lean()
      .then((goals) => {
        return this.mapGoalDocuments(
          goals.map((goal) => {
            // Create aliases for frontend compatibility
            if (goal.ownerId) {
              goal.owner = goal.ownerId;
            }
            if (goal.workspaceId) {
              goal.workspace = goal.workspaceId;
            }
            return goal;
          }),
        );
      });
  }

  async findOne(id: string): Promise<GoalDocument> {
    const goal = await this.goalModel
      .findById(id)
      .populate({
        path: 'ownerId',
        model: 'User',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'workspaceId',
        model: 'Workspace',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'linkedTasks',
        model: 'Task',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'projects',
        model: 'Project',
        options: { strictPopulate: false },
      })
      .lean()
      .exec();

    if (!goal) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }

    // Create aliases for frontend compatibility
    if (goal.ownerId) {
      goal.owner = goal.ownerId;
    }
    if (goal.workspaceId) {
      goal.workspace = goal.workspaceId;
    }

    return this.mapGoalDocument(goal);
  }

  async update(
    id: string,
    updateGoalDto: UpdateGoalDto,
  ): Promise<GoalDocument> {
    const existingGoal = await this.findOne(id);

    const updatedGoal = await this.goalModel
      .findByIdAndUpdate(id, updateGoalDto, { new: true })
      .populate({
        path: 'ownerId',
        model: 'User',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'workspaceId',
        model: 'Workspace',
        options: { strictPopulate: false },
      })
      .lean()
      .exec();

    // Create aliases for frontend compatibility
    if (updatedGoal.ownerId) {
      updatedGoal.owner = updatedGoal.ownerId;
    }
    if (updatedGoal.workspaceId) {
      updatedGoal.workspace = updatedGoal.workspaceId;
    }

    return this.mapGoalDocument(updatedGoal);
  }

  async remove(id: string): Promise<void> {
    const result = await this.goalModel.deleteOne({ _id: id }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException(`Goal with ID "${id}" not found`);
    }
  }

  async getHierarchy(options?: {
    workspaceId?: string;
  }): Promise<GoalDocument[]> {
    try {
      console.log('Fetching goal hierarchy with options:', options);

      // Get all root goals (goals without parent)
      let query = this.goalModel
        .find({ parentGoalId: { $exists: false } })
        .populate({
          path: 'ownerId',
          model: 'User',
          options: { strictPopulate: false },
        })
        .populate({
          path: 'workspaceId',
          model: 'Workspace',
          options: { strictPopulate: false },
        });

      if (options?.workspaceId) {
        console.log('Filtering by workspaceId:', options.workspaceId);
        query = query.where('workspaceId').equals(options.workspaceId);
      }

      const rootGoals = await query.lean().exec();
      console.log(`Found ${rootGoals?.length || 0} root goals`);

      // Return empty array if no root goals
      if (!rootGoals || rootGoals.length === 0) {
        console.log('No root goals found, returning empty array');
        return [];
      }

      // Create aliases for frontend compatibility
      rootGoals.forEach((goal) => {
        if (goal.ownerId) {
          goal.owner = goal.ownerId;
        }
        if (goal.workspaceId) {
          goal.workspace = goal.workspaceId;
        }
      });

      // Recursively fetch all children for each root goal
      for (const rootGoal of rootGoals) {
        await this.loadChildren(rootGoal);
      }

      return this.mapGoalDocuments(rootGoals);
    } catch (error) {
      console.error('Error in getHierarchy:', error);
      throw error;
    }
  }

  // Helper function to recursively load children goals
  private async loadChildren(goal: any): Promise<void> {
    try {
      const children = await this.goalModel
        .find({ parentGoalId: goal._id })
        .populate({
          path: 'ownerId',
          model: 'User',
          options: { strictPopulate: false },
        })
        .populate({
          path: 'workspaceId',
          model: 'Workspace',
          options: { strictPopulate: false },
        })
        .lean()
        .exec();

      // Create aliases for frontend compatibility on children
      children.forEach((child) => {
        if (child.ownerId) {
          child.owner = child.ownerId;
        }
        if (child.workspaceId) {
          child.workspace = child.workspaceId;
        }
      });

      // Assign the found children to the goal
      goal.children = children;

      // Recursively load children for each child
      for (const child of children) {
        await this.loadChildren(child);
      }
    } catch (error) {
      console.error(`Error loading children for goal ${goal._id}:`, error);
      // Don't throw error, just set empty children to avoid breaking the hierarchy
      goal.children = [];
    }
  }

  async linkTaskToGoal(goalId: string, taskId: string): Promise<GoalDocument> {
    const goal = await this.findOne(goalId);

    if (!goal.linkedTasks.includes(taskId)) {
      const updatedGoal = await this.goalModel
        .findByIdAndUpdate(
          goalId,
          { $push: { linkedTasks: taskId } },
          { new: true },
        )
        .populate({
          path: 'ownerId',
          model: 'User',
          options: { strictPopulate: false },
        })
        .populate({
          path: 'workspaceId',
          model: 'Workspace',
          options: { strictPopulate: false },
        })
        .lean();

      // Create aliases for frontend compatibility
      if (updatedGoal.ownerId) {
        updatedGoal.owner = updatedGoal.ownerId;
      }
      if (updatedGoal.workspaceId) {
        updatedGoal.workspace = updatedGoal.workspaceId;
      }

      return this.mapGoalDocument(updatedGoal);
    }

    return goal;
  }

  async unlinkTaskFromGoal(
    goalId: string,
    taskId: string,
  ): Promise<GoalDocument> {
    const updatedGoal = await this.goalModel
      .findByIdAndUpdate(
        goalId,
        { $pull: { linkedTasks: taskId } },
        { new: true },
      )
      .populate({
        path: 'ownerId',
        model: 'User',
        options: { strictPopulate: false },
      })
      .populate({
        path: 'workspaceId',
        model: 'Workspace',
        options: { strictPopulate: false },
      })
      .lean();

    // Create aliases for frontend compatibility
    if (updatedGoal.ownerId) {
      updatedGoal.owner = updatedGoal.ownerId;
    }
    if (updatedGoal.workspaceId) {
      updatedGoal.workspace = updatedGoal.workspaceId;
    }

    return this.mapGoalDocument(updatedGoal);
  }

  async calculateGoalProgress(goalId: string): Promise<number> {
    const goal = await this.findOne(goalId);

    // If no linked tasks and no children, keep current progress
    if (
      (!goal.linkedTasks || goal.linkedTasks.length === 0) &&
      (!goal.children || goal.children.length === 0)
    ) {
      return goal.progress;
    }

    // If has linked tasks, calculate based on completed tasks
    if (goal.linkedTasks && goal.linkedTasks.length > 0) {
      const completedTasks = goal.linkedTasks.filter((task: any) => {
        // Check if task is an object with status property
        if (typeof task === 'object' && task !== null) {
          return task.status === 'completed';
        }
        return false;
      });
      const progress = Math.round(
        (completedTasks.length / goal.linkedTasks.length) * 100,
      );

      // Update the goal progress
      await this.update(goalId, { progress });

      return progress;
    }

    // If has children but no linked tasks, calculate based on children's progress
    if (goal.children && goal.children.length > 0) {
      const totalChildrenProgress = goal.children.reduce(
        (sum, child) =>
          sum + (typeof child.progress === 'number' ? child.progress : 0),
        0,
      );
      const progress = Math.round(totalChildrenProgress / goal.children.length);

      // Update the goal progress
      await this.update(goalId, { progress });

      return progress;
    }

    return goal.progress;
  }
}
