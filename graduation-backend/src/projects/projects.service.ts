/* eslint-disable prettier/prettier */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Project } from './schema/projects.schema';
import {
  CreateProjectDto,
  AddMemberDto,
  UpdateProjectStatusDto,
} from './dto/projects.dto';
import { ActivityLogsService } from '../activity-logs/activity-logs.service';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { NotificationEventsService } from '../notifications/notification-events.service';

// Interface for authenticated user
interface AuthUser {
  userId: string;
  name: string;
}

@Injectable()
export class ProjectsService {
  constructor(
    @InjectModel(Project.name) private projectModel: Model<Project>,
    private readonly activityLogsService: ActivityLogsService,
    private readonly workspacesService: WorkspacesService,
    private readonly notificationEventsService: NotificationEventsService,
  ) {}

  async createProject(
    createProjectDto: CreateProjectDto,
    authUser?: AuthUser,
  ): Promise<Project> {
    const {
      name,
      description,
      color,
      status,
      ownerId,
      workspaceId,
      visibility,
    } = createProjectDto;

    console.log(
      `Creating project with owner ${ownerId} in workspace ${workspaceId}`,
    );

    // Validate ownerId
    if (!Types.ObjectId.isValid(ownerId)) {
      throw new BadRequestException('Invalid owner ID');
    }

    // Validate workspaceId
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    // Verify that the user has access to the workspace
    try {
      console.log(
        `Verifying workspace access for user ${ownerId} in workspace ${workspaceId}`,
      );
      const workspace = await this.workspacesService.findById(
        workspaceId,
        ownerId,
      );

      // Additional check for admin/owner role at project creation
      if (workspace) {
        console.log(
          `Workspace found, checking member role: ${JSON.stringify(workspace.owner)}`,
        );

        // Owner check
        const isOwner = workspace.owner.toString() === ownerId.toString();

        // Admin/member check
        let userRole = null;

        // Handle various member formats
        if (Array.isArray(workspace.members)) {
          for (const member of workspace.members) {
            if (typeof member === 'string') {
              // Old format: string ID
              if (member === ownerId) {
                userRole = 'member'; // Default role for string members
                break;
              }
            } else if (typeof member === 'object' && member !== null) {
              // New format: object with userId and role
              const memberId = member.userId?.toString();
              if (memberId === ownerId.toString()) {
                userRole = member.role || 'member';
                break;
              }
            }
          }
        }

        console.log(`User role in workspace: ${userRole}, isOwner: ${isOwner}`);

        // Only owner and admin can create projects
        if (
          !isOwner &&
          (!userRole || (userRole !== 'admin' && userRole !== 'owner'))
        ) {
          throw new ForbiddenException(
            'Only workspace owners and admins can create projects',
          );
        }
      }
    } catch (error) {
      console.error(`Workspace access error: ${error.message}`);
      throw new ForbiddenException(
        error.message || 'You do not have access to this workspace',
      );
    }

    // Build a new Project instance
    const project = new this.projectModel({
      name,
      description,
      color,
      status: status || 'on-track', // Set default status if not provided
      visibility: visibility || 'public', // Set default visibility if not provided
      workspaceId: new Types.ObjectId(workspaceId),
      roles: [{ userId: new Types.ObjectId(ownerId), role: 'Owner' }],
      createdBy: new Types.ObjectId(ownerId),
    });

    const savedProject = await project.save();
    console.log(`Project created: ${savedProject._id}`);

    // Log project creation
    await this.activityLogsService.createLog({
      projectId: savedProject._id.toString(),
      type: 'created',
      content: 'Created new project',
      user: authUser,
    });

    return savedProject;
  }

  async findAllProjects(userId: string): Promise<Project[]> {
    console.log('Finding projects for userId:', userId);

    // First, let's check if the userId is valid
    if (!userId || !Types.ObjectId.isValid(userId)) {
      console.log('Invalid userId format:', userId);
      return [];
    }

    // Get all workspaces the user has access to
    const workspaces = await this.workspacesService.findAll(userId);
    const workspaceIds = workspaces.map((workspace) => workspace._id);

    // Find all projects where the user has access and belongs to one of their workspaces
    const projects = await this.projectModel
      .find({
        workspaceId: { $in: workspaceIds },
        'roles.userId': new Types.ObjectId(userId),
      })
      .populate({
        path: 'sections',
        match: { _id: { $exists: true } },
      })
      .exec();

    console.log('Projects found for user:', JSON.stringify(projects, null, 2));

    // Filter out null sections from each project
    const filteredProjects = projects.map((project) => {
      project.sections = project.sections.filter((section) => section !== null);
      return project;
    });

    return filteredProjects;
  }

  async findProjectsByWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<Project[]> {
    if (!workspaceId || !Types.ObjectId.isValid(workspaceId)) {
      throw new BadRequestException('Invalid workspace ID');
    }

    console.log(
      `Finding projects for workspace ${workspaceId} and user ${userId}`,
    );

    // Verify that the user has access to the workspace
    try {
      const workspace = await this.workspacesService.findById(
        workspaceId,
        userId,
      );

      if (!workspace) {
        console.log(
          `User ${userId} does not have access to workspace ${workspaceId}`,
        );
        throw new ForbiddenException(
          'You do not have access to this workspace',
        );
      }

      console.log(`User ${userId} has access to workspace ${workspaceId}`);

      // Check if user is workspace owner or admin (they can see all projects)
      const isWorkspaceAdmin =
        workspace.owner.toString() === userId ||
        (Array.isArray(workspace.members) &&
          workspace.members.some((m) => {
            if (typeof m === 'object' && m.userId && m.role) {
              return (
                m.userId.toString() === userId &&
                ['owner', 'admin'].includes(m.role.toLowerCase())
              );
            }
            return false;
          }));

      console.log(`User ${userId} is workspace admin: ${isWorkspaceAdmin}`);

      // Build the query based on visibility and user role
      let query: {
        workspaceId: Types.ObjectId;
        $or?: Array<
          { visibility: string } | { 'roles.userId': Types.ObjectId }
        >;
      } = { workspaceId: new Types.ObjectId(workspaceId) };

      // If not an admin, only show public projects OR projects where user is a member
      if (!isWorkspaceAdmin) {
        query = {
          workspaceId: new Types.ObjectId(workspaceId),
          $or: [
            { visibility: 'public' },
            { 'roles.userId': new Types.ObjectId(userId) },
          ],
        };
      }

      console.log(`Using query: ${JSON.stringify(query)}`);

      // Find matching projects
      const queryWithTyping: {
        $and: [
          { workspaceId: Types.ObjectId },
          {
            $or: Array<
              { visibility: string } | { 'roles.userId': Types.ObjectId }
            >;
          },
        ];
      } = {
        $and: [
          { workspaceId: new Types.ObjectId(workspaceId) },
          {
            $or: [
              { visibility: 'public' },
              { 'roles.userId': new Types.ObjectId(userId) },
            ],
          },
        ],
      };

      const projects = await this.projectModel
        .find(queryWithTyping)
        .populate({
          path: 'sections',
          match: { _id: { $exists: true } },
        })
        .exec();

      console.log(
        `Found ${projects.length} projects in workspace ${workspaceId}`,
      );

      // Filter out null sections from each project and update user roles
      const filteredProjects = projects.map((project) => {
        // If project is public, add user to project roles if they're not already there
        const userInRoles = project.roles.some(
          (role) => role.userId.toString() === userId,
        );

        if (project.visibility === 'public' && !userInRoles) {
          console.log(
            `Adding user ${userId} to public project ${project._id} roles`,
          );

          // Update the database
          this.projectModel
            .findByIdAndUpdate(
              project._id,
              {
                $push: {
                  roles: {
                    userId: new Types.ObjectId(userId),
                    role: 'Member', // Default role for workspace members
                  },
                },
              },
              { new: true },
            )
            .exec()
            .catch((err) => {
              console.error(
                `Failed to add user ${userId} to project ${project._id}: ${err.message}`,
              );
            });

          // Update the in-memory object to be returned
          project.roles.push({
            userId: new Types.ObjectId(userId),
            role: 'Member',
          });
        }

        project.sections = project.sections.filter(
          (section) => section !== null,
        );
        return project;
      });

      return filteredProjects;
    } catch (error) {
      console.error(`Error in findProjectsByWorkspace: ${error.message}`);
      throw new ForbiddenException('You do not have access to this workspace');
    }
  }

  async getProjectById(id: string, userId: string): Promise<Project> {
    if (!id || !Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!userId || !Types.ObjectId.isValid(userId)) {
      throw new BadRequestException('Invalid user ID');
    }

    console.log('Fetching project with ID:', id, 'for user:', userId);

    // First, let's check if the project exists at all
    const project = await this.projectModel
      .findById(id)
      .populate({
        path: 'sections',
        model: 'Section',
        match: { _id: { $exists: true } },
        populate: {
          path: 'tasks',
          model: 'Task',
          options: { sort: { order: 1 } },
        },
      })
      .exec();

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Check if the user has direct access to the project via roles
    let hasDirectProjectAccess = project.roles.some((role) => {
      const roleMatch = role.userId.toString() === userId;
      if (roleMatch) {
        console.log(
          `User ${userId} has direct access to project ${id} with role: ${role.role}`,
        );
      }
      return roleMatch;
    });

    // Check if the user has access to the workspace
    let hasWorkspaceAccess = false;
    let isWorkspaceAdmin = false;

    try {
      const workspace = await this.workspacesService.findById(
        project.workspaceId.toString(),
        userId,
      );

      if (workspace) {
        console.log(
          `User ${userId} has access to workspace ${project.workspaceId}`,
        );
        hasWorkspaceAccess = true;

        // Check if user is workspace owner or admin
        isWorkspaceAdmin =
          workspace.owner.toString() === userId ||
          (Array.isArray(workspace.members) &&
            workspace.members.some((m) => {
              if (typeof m === 'object' && m.userId && m.role) {
                return (
                  m.userId.toString() === userId &&
                  ['owner', 'admin'].includes(m.role.toLowerCase())
                );
              }
              return false;
            }));

        console.log(`User ${userId} is workspace admin: ${isWorkspaceAdmin}`);

        // For public projects, add workspace members to project roles if not already there
        if (project.visibility === 'public' && !hasDirectProjectAccess) {
          console.log(
            `Adding user ${userId} to public project ${id} roles as they have workspace access`,
          );

          // Add the user to the project roles
          await this.projectModel.findByIdAndUpdate(
            id,
            {
              $push: {
                roles: {
                  userId: new Types.ObjectId(userId),
                  role: 'Member', // Default role for workspace members
                },
              },
            },
            { new: true },
          );

          // Update the project object with the new role
          project.roles.push({
            userId: new Types.ObjectId(userId),
            role: 'Member',
          });

          // Now they have direct access
          hasDirectProjectAccess = true;
        }
      }
    } catch (error) {
      console.log(
        `User ${userId} does not have access to workspace ${project.workspaceId}: ${error.message}`,
      );
      hasWorkspaceAccess = false;
    }

    // Build permission check logic
    let hasAccess = false;

    // Case 1: User has direct project access (they are in project.roles)
    if (hasDirectProjectAccess) {
      hasAccess = true;
    }
    // Case 2: User is workspace admin (owner or admin) - they can see all projects
    else if (isWorkspaceAdmin) {
      hasAccess = true;

      // Add admin to project roles for convenience
      console.log(`Adding workspace admin ${userId} to project ${id} roles`);
      await this.projectModel
        .findByIdAndUpdate(
          id,
          {
            $push: {
              roles: {
                userId: new Types.ObjectId(userId),
                role: 'Admin', // Workspace admins get Admin role in projects
              },
            },
          },
          { new: true },
        )
        .catch((error) => {
          console.error(
            `Failed to add admin to project roles: ${error.message}`,
          );
        });

      // Update the project object
      project.roles.push({
        userId: new Types.ObjectId(userId),
        role: 'Admin',
      });
    }
    // Case 3: Project is public AND user has workspace access
    else if (project.visibility === 'public' && hasWorkspaceAccess) {
      hasAccess = true;
    }

    // Reject if no access
    if (!hasAccess) {
      console.log(
        `Access denied: User ${userId} has no access to project ${id} (visibility: ${project.visibility})`,
      );
      throw new ForbiddenException(
        `User does not have access to project ${id}`,
      );
    }

    // Filter out any null sections
    project.sections = project.sections.filter((section) => section !== null);

    return project;
  }

  async updateProjectStatus(
    projectId: string,
    updateStatusDto: UpdateProjectStatusDto,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Find project and verify user access
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Store original status for notification
    const oldStatus = project.status || 'No status';
    const newStatus = updateStatusDto.status;

    // Prepare update object
    const updateObj: any = { status: newStatus };

    // If status is 'completed', set completed flag and timestamp
    if (newStatus === 'completed') {
      updateObj.completed = true;
      updateObj.completedAt = new Date();
    } else {
      // If status is changed from completed to something else, reset completed flag
      if (project.completed) {
        updateObj.completed = false;
        updateObj.completedAt = null;
      }
    }

    // Update project status
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(projectId, updateObj, { new: true })
      .exec();

    // Log project status update
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: `Changed project status from ${oldStatus} to ${newStatus}`,
      user: authUser,
    });

    // Send notifications to project members about the status update
    if (project.roles && authUser) {
      // Get all project members except the updater
      const projectMembers = project.roles
        .filter((role) => role.userId.toString() !== userId)
        .map((role) => role.userId.toString());

      // Send notifications to each member
      for (const memberId of projectMembers) {
        await this.notificationEventsService.onProjectStatusChanged(
          memberId,
          userId,
          authUser.name || 'A team member',
          projectId,
          project.name,
          oldStatus,
          newStatus,
        );
      }
    }

    return updatedProject;
  }

  async updateProjectDescription(
    projectId: string,
    description: string,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Find project and verify user access
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Update project description
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(projectId, { description }, { new: true })
      .exec();

    // Log project description update
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: 'Updated project description',
      user: authUser,
    });

    // Send notifications to project members about the description update
    if (project.roles && authUser) {
      // Get all project members except the updater
      const projectMembers = project.roles
        .filter((role) => role.userId.toString() !== userId)
        .map((role) => role.userId.toString());

      // Send notifications to each member
      for (const memberId of projectMembers) {
        await this.notificationEventsService.onProjectUpdated(
          memberId,
          userId,
          authUser.name || 'A team member',
          projectId,
          project.name,
          'updated the description',
        );
      }
    }

    return updatedProject;
  }

  async addProjectMember(
    projectId: string,
    memberData: AddMemberDto,
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    if (!Types.ObjectId.isValid(memberData.userId)) {
      throw new BadRequestException('Invalid member user ID');
    }

    // Find project and verify user access
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if the user is already a member
    const isMember = project.roles.some(
      (r) => r.userId.toString() === memberData.userId,
    );
    if (isMember) {
      throw new BadRequestException('User is already a member of this project');
    }

    // Add the member
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        {
          $push: {
            roles: {
              userId: new Types.ObjectId(memberData.userId),
              role: memberData.role || 'Member',
            },
          },
        },
        { new: true },
      )
      .exec();

    // Log adding a member
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: `Added ${memberData.userName || memberData.userId} as ${
        memberData.role || 'Member'
      }`,
      user: authUser,
    });

    // Get the new member's name
    const memberName = memberData.userName || 'A new member';
    const memberRole = memberData.role || 'Member';

    // Send notification to the new member
    if (authUser) {
      await this.notificationEventsService.onMemberAdded(
        memberData.userId,
        userId,
        authUser.name || 'A team member',
        projectId,
        project.name,
        'project',
        memberRole,
      );
    }

    // Send notifications to existing project members about the new addition
    if (project.roles && authUser) {
      // Get all project members except the updater and the new member
      const projectMembers = project.roles
        .filter(
          (role) =>
            role.userId.toString() !== userId &&
            role.userId.toString() !== memberData.userId,
        )
        .map((role) => role.userId.toString());

      // Send notifications to each existing member
      for (const memberId of projectMembers) {
        await this.notificationEventsService.onProjectStatusChanged(
          memberId,
          userId,
          authUser.name || 'A team member',
          projectId,
          project.name,
          'Members list',
          `Members list with ${memberName} added as ${memberRole}`,
        );
      }
    }

    return updatedProject;
  }

  async getProjectActivities(projectId: string, userId: string) {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // First, get the project to validate access
    await this.getProjectById(projectId, userId);

    // Use the activity logs service to get real logs
    return this.activityLogsService.getLogsByProjectId(projectId);
  }

  async updateProjectVisibility(
    projectId: string,
    visibilityData: { visibility: string },
    userId: string,
    authUser?: AuthUser,
  ): Promise<Project> {
    if (!Types.ObjectId.isValid(projectId)) {
      throw new BadRequestException('Invalid project ID');
    }

    // Find project and verify user access
    const project = await this.getProjectById(projectId, userId);
    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // Check if user has permission to update visibility (only admin or owner)
    const userRole = project.roles.find(
      (role) => role.userId.toString() === userId,
    )?.role;
    if (!userRole || !['Owner', 'Admin'].includes(userRole)) {
      throw new ForbiddenException(
        'Only project owners and admins can change project visibility',
      );
    }

    // Update project visibility
    const updatedProject = await this.projectModel
      .findByIdAndUpdate(
        projectId,
        { visibility: visibilityData.visibility },
        { new: true },
      )
      .exec();

    // Log project visibility update
    await this.activityLogsService.createLog({
      projectId,
      type: 'updated',
      content: `Changed project visibility to: ${visibilityData.visibility}`,
      user: authUser,
    });

    // Send notifications to project members about the visibility update
    if (project.roles && authUser) {
      // Get all project members except the updater
      const projectMembers = project.roles
        .filter((role) => role.userId.toString() !== userId)
        .map((role) => role.userId.toString());

      // Send notifications to each member
      for (const memberId of projectMembers) {
        await this.notificationEventsService.onProjectUpdated(
          memberId,
          userId,
          authUser.name || 'A team member',
          projectId,
          project.name,
          `updated the visibility to ${visibilityData.visibility}`,
        );
      }
    }

    return updatedProject;
  }
}
