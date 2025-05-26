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
    console.log('Creating goal with data:', createGoalDto);
    console.log('Is private:', createGoalDto.isPrivate);
    console.log('Owner ID:', createGoalDto.ownerId);
    console.log('Initial members array:', createGoalDto.members);

    // Ensure members array always includes the owner for permission purposes
    if (!createGoalDto.members) {
      createGoalDto.members = [createGoalDto.ownerId];
      console.log('No members provided, setting owner as the only member');
    } else if (!createGoalDto.members.includes(createGoalDto.ownerId)) {
      createGoalDto.members.push(createGoalDto.ownerId);
      console.log('Adding owner to members list for permission purposes');
    } else {
      console.log('Owner already included in members list');
    }

    console.log(
      'Final members list (includes owner for permissions):',
      createGoalDto.members,
    );

    // Convert member IDs to proper ObjectIds if they're not already
    try {
      const { Types } = require('mongoose');

      if (createGoalDto.members && createGoalDto.members.length > 0) {
        // Convert string IDs to ObjectId
        createGoalDto.members = createGoalDto.members.map((id) => {
          // If it's a string and a valid ObjectId, convert it
          if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
            console.log(`Converting member ID ${id} to ObjectId`);
            return new Types.ObjectId(id);
          }
          return id; // Return as is if already ObjectId or not valid
        });

        console.log('Converted members:', createGoalDto.members);
      }
    } catch (error) {
      console.error('Error converting member IDs to ObjectIds:', error);
    }

    const newGoal = new this.goalModel(createGoalDto);
    console.log('New goal model before save:', newGoal);
    console.log('Members in new goal model:', newGoal.members);

    const savedGoal = await newGoal.save();
    console.log('Saved goal:', savedGoal);
    console.log('Members in saved goal:', savedGoal.members);

    return savedGoal;
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
    isPrivate?: boolean;
    userId?: string;
  }): Promise<GoalDocument[]> {
    let query = this.goalModel.find();

    // Apply filters if provided
    if (filters) {
      // Special handling for private goals with user ID
      if (filters.isPrivate === true && filters.userId) {
        console.log(
          `Finding private goals for user ${filters.userId} in workspace ${filters.workspaceId}`,
        );

        // Find goals where either:
        // 1. User is the owner, OR
        // 2. User is in the members array
        query = query.where({
          $and: [
            { isPrivate: true },
            { workspaceId: filters.workspaceId },
            {
              $or: [
                { ownerId: filters.userId },
                { members: { $in: [filters.userId] } },
              ],
            },
          ],
        });

        // Add debug log to show the MongoDB query
        console.log('MongoDB query:', JSON.stringify(query.getFilter()));
      } else if (filters.isPrivate === false && filters.workspaceId) {
        // For public goals, just filter by workspace
        console.log(
          `Finding public goals for workspace ${filters.workspaceId}`,
        );
        query = query.where({
          isPrivate: false,
          workspaceId: filters.workspaceId,
        });
      } else {
        // Standard filtering
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

        if (filters.isPrivate !== undefined) {
          query = query.where('isPrivate').equals(filters.isPrivate);
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
      .populate({
        path: 'members',
        model: 'User',
        options: { strictPopulate: false },
      })
      .lean()
      .then((goals) => {
        console.log(`Found ${goals.length} goals matching the query`);
        if (goals.length > 0) {
          console.log('First goal:', JSON.stringify(goals[0]));
          // Check if any goals have members
          const goalsWithMembers = goals.filter(
            (goal) => goal.members && goal.members.length > 0,
          );
          console.log(`Goals with members: ${goalsWithMembers.length}`);
          if (goalsWithMembers.length > 0) {
            console.log(
              'First goal with members:',
              JSON.stringify(goalsWithMembers[0]),
            );
          }
        }

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
    console.log(`Finding goal with ID: ${id}`);

    const goal = await this.goalModel
      .findById(id)
      .populate({
        path: 'ownerId',
        model: 'User',
        select: '_id fullName email',
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
      .populate({
        path: 'members',
        model: 'User',
        select: '_id fullName email',
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
      console.log('Owner populated:', goal.owner);
    }
    if (goal.workspaceId) {
      goal.workspace = goal.workspaceId;
    }

    // Log members for debugging
    console.log(`Goal ${id} has ${goal.members?.length || 0} members`);
    if (goal.members && goal.members.length > 0) {
      console.log('Members populated:', goal.members);
    }

    return this.mapGoalDocument(goal);
  }

  async update(
    id: string,
    updateGoalDto: UpdateGoalDto,
  ): Promise<GoalDocument> {
    const existingGoal = await this.findOne(id);

    // Convert member IDs to proper ObjectIds if they're being updated
    try {
      const { Types } = require('mongoose');

      if (updateGoalDto.members && updateGoalDto.members.length > 0) {
        // Convert string IDs to ObjectId
        updateGoalDto.members = updateGoalDto.members.map((id) => {
          // If it's a string and a valid ObjectId, convert it
          if (typeof id === 'string' && Types.ObjectId.isValid(id)) {
            console.log(`Converting member ID ${id} to ObjectId in update`);
            return new Types.ObjectId(id);
          }
          return id; // Return as is if already ObjectId or not valid
        });

        console.log('Converted members for update:', updateGoalDto.members);
      }
    } catch (error) {
      console.error(
        'Error converting member IDs to ObjectIds in update:',
        error,
      );
    }

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
      .populate({
        path: 'members',
        model: 'User',
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
    isPrivate?: boolean;
    includeProjects?: boolean;
    includeTasks?: boolean;
  }): Promise<GoalDocument[]> {
    try {
      console.log('Fetching goal hierarchy with options:', options);

      // Simplified approach: Just get all goals for the workspace
      // This removes the goal hierarchy concept and treats all goals as top-level
      let query = this.goalModel
        .find({}) // Start with an empty filter
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
          path: 'members',
          model: 'User',
          options: { strictPopulate: false },
        });

      // Conditionally populate projects and tasks if requested
      if (options?.includeProjects) {
        console.log('Including projects with full data in response');
        query = query.populate({
          path: 'projects',
          model: 'Project',
          select:
            '_id name description color status completed completedAt progress workspaceId',
          options: { strictPopulate: false },
        });
      }

      if (options?.includeTasks) {
        console.log('Including tasks with full data in response');
        query = query.populate({
          path: 'linkedTasks',
          model: 'Task',
          select: '_id title description completed status priority dueDate',
          options: { strictPopulate: false },
        });
      }

      // Log the initial query
      console.log('Initial MongoDB query:', JSON.stringify(query.getFilter()));

      // Apply workspace filter if provided (this is now the main filter)
      if (options?.workspaceId) {
        console.log('Filtering by workspaceId:', options.workspaceId);
        query = query.where('workspaceId').equals(options.workspaceId);
      }

      // Filter by isPrivate if specified
      if (options?.isPrivate !== undefined) {
        console.log('Filtering by isPrivate:', options.isPrivate);
        query = query.where('isPrivate').equals(options.isPrivate);
      }

      // Log the final query
      console.log('Final MongoDB query:', JSON.stringify(query.getFilter()));

      const goals = await query.lean().exec();
      console.log(`Found ${goals?.length || 0} goals`);

      // Return empty array if no goals
      if (!goals || goals.length === 0) {
        console.log('No goals found, returning empty array');
        return [];
      }

      // Create aliases for frontend compatibility
      goals.forEach((goal) => {
        if (goal.ownerId) {
          goal.owner = goal.ownerId;
        }
        if (goal.workspaceId) {
          goal.workspace = goal.workspaceId;
        }

        // Debug projects and tasks population
        if (options?.includeProjects && goal.projects) {
          console.log(`Goal ${goal._id} has ${goal.projects.length} projects`);
          if (goal.projects.length > 0) {
            const firstProject = goal.projects[0];
            console.log(
              `First project data sample:`,
              typeof firstProject === 'string'
                ? `String ID: ${firstProject}`
                : `Object with keys: ${Object.keys(firstProject).join(', ')}`,
            );
          }
        }

        if (options?.includeTasks && goal.linkedTasks) {
          console.log(`Goal ${goal._id} has ${goal.linkedTasks.length} tasks`);
          if (goal.linkedTasks.length > 0) {
            const firstTask = goal.linkedTasks[0];
            console.log(
              `First task data sample:`,
              typeof firstTask === 'string'
                ? `String ID: ${firstTask}`
                : `Object with keys: ${Object.keys(firstTask).join(', ')}`,
            );
          }
        }
      });

      // No need to recursively load children, we've decided to use a flat structure
      // Each goal will be displayed at the same level in the strategy map

      return this.mapGoalDocuments(goals);
    } catch (error) {
      console.error('Error in getHierarchy:', error);
      throw error;
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
        .populate({
          path: 'members',
          model: 'User',
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
      .populate({
        path: 'members',
        model: 'User',
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
    console.log(`Calculating progress for goal: ${goalId}`);

    try {
      // Fetch a fresh instance of the goal to ensure we have the latest data
      const goal = await this.goalModel
        .findById(goalId)
        .populate({
          path: 'projects',
          model: 'Project',
          select: '_id name status completed',
          options: { strictPopulate: false },
        })
        .populate({
          path: 'linkedTasks',
          model: 'Task',
          select: '_id title status completed',
          options: { strictPopulate: false },
        })
        .lean()
        .exec();

      if (!goal) {
        console.log(
          `Goal with ID ${goalId} not found for progress calculation`,
        );
        return 0;
      }

      console.log(`Fetched fresh goal data for progress calculation`);

      // If goal doesn't have a progressResource or it's set to 'none', keep current progress
      if (!goal.progressResource || goal.progressResource === 'none') {
        console.log(
          `Goal has no progress resource, keeping current progress: ${goal.progress}%`,
        );
        return goal.progress;
      }

      // Calculate progress based on linked projects if progressResource is 'projects'
      if (
        goal.progressResource === 'projects' &&
        goal.projects &&
        goal.projects.length > 0
      ) {
        console.log(
          `Calculating progress based on ${goal.projects.length} projects`,
        );

        // Since we already populated projects, we can use them directly
        const projectObjects = goal.projects as any[];
        if (!projectObjects || projectObjects.length === 0) {
          console.log(
            `No project objects found, keeping current progress: ${goal.progress}%`,
          );
          return goal.progress;
        }

        // Debug each project to verify completion status
        projectObjects.forEach((project, index) => {
          console.log(`Project ${index + 1}:`, {
            id: project._id || 'unknown',
            name: project.name || 'unnamed',
            completed: !!project.completed,
            status: project.status || 'unknown',
          });
        });

        // Calculate based on completed projects
        const completedProjects = projectObjects.filter(
          (project) =>
            project.completed === true || project.status === 'completed',
        );

        console.log(
          `Found ${completedProjects.length} completed projects out of ${projectObjects.length}`,
        );

        const progress = Math.round(
          (completedProjects.length / projectObjects.length) * 100,
        );

        console.log(`Calculated progress: ${progress}%`);

        // Check if progress has changed
        if (progress !== goal.progress) {
          console.log(
            `Progress changed from ${goal.progress}% to ${progress}%`,
          );
          // Update the goal progress
          await this.update(goalId, { progress });
        } else {
          console.log(`Progress unchanged at ${progress}%`);
        }

        return progress;
      }

      // Calculate progress based on linked tasks if progressResource is 'tasks'
      if (
        goal.progressResource === 'tasks' &&
        goal.linkedTasks &&
        goal.linkedTasks.length > 0
      ) {
        console.log(
          `Calculating progress based on ${goal.linkedTasks.length} tasks`,
        );

        // Since we already populated linkedTasks, we can use them directly
        const taskObjects = goal.linkedTasks as any[];
        if (!taskObjects || taskObjects.length === 0) {
          console.log(
            `No task objects found, keeping current progress: ${goal.progress}%`,
          );
          return goal.progress;
        }

        // Debug each task to verify completion status
        taskObjects.forEach((task, index) => {
          console.log(`Task ${index + 1}:`, {
            id: task._id || 'unknown',
            title: task.title || 'unnamed',
            completed: !!task.completed,
            status: task.status || 'unknown',
          });
        });

        // Calculate based on completed tasks - check both "completed" flag and "status" field
        const completedTasks = taskObjects.filter(
          (task) => task.completed === true || task.status === 'completed',
        );

        console.log(
          `Found ${completedTasks.length} completed tasks out of ${taskObjects.length}`,
        );

        const progress = Math.round(
          (completedTasks.length / taskObjects.length) * 100,
        );

        console.log(`Calculated progress: ${progress}%`);

        // Check if progress has changed
        if (progress !== goal.progress) {
          console.log(
            `Progress changed from ${goal.progress}% to ${progress}%`,
          );
          // Update the goal progress
          await this.update(goalId, { progress });
        } else {
          console.log(`Progress unchanged at ${progress}%`);
        }

        return progress;
      }

      // If has children goals but no selected progress resource, calculate based on children's progress
      if (goal.children && goal.children.length > 0) {
        console.log(
          `Calculating progress based on ${goal.children.length} child goals`,
        );

        const totalChildrenProgress = goal.children.reduce(
          (sum, child) =>
            sum + (typeof child.progress === 'number' ? child.progress : 0),
          0,
        );
        const progress = Math.round(
          totalChildrenProgress / goal.children.length,
        );

        console.log(`Calculated progress from children: ${progress}%`);

        // Check if progress has changed
        if (progress !== goal.progress) {
          console.log(
            `Progress changed from ${goal.progress}% to ${progress}%`,
          );
          // Update the goal progress
          await this.update(goalId, { progress });
        } else {
          console.log(`Progress unchanged at ${progress}%`);
        }

        return progress;
      }

      console.log(
        `No progress calculation method applied, keeping current progress: ${goal.progress}%`,
      );
      return goal.progress;
    } catch (error) {
      console.error(`Error calculating goal progress: ${error.message}`);
      // In case of error, return current progress if available, or 0
      return 0;
    }
  }
}
