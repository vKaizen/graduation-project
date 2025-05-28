/* eslint-disable prettier/prettier */
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invite, InviteStatus } from './schema/invites.schema';
import {
  CreateInviteDto,
  AcceptInviteDto,
  InviteResponseDto,
} from './dto/invites.dto';
import { WorkspacesService } from '../workspaces/workspaces.service';
import { UsersService } from '../users/users.service';
import { NotificationsGateway } from '../websockets/notifications.gateway';
import { NotificationEventsService } from '../notifications/notification-events.service';
import { ProjectsService } from '../projects/projects.service';
import { WorkspaceRole } from '../workspaces/schema/workspaces.schema';
import * as crypto from 'crypto';

@Injectable()
export class InvitesService {
  constructor(
    @InjectModel(Invite.name) private inviteModel: Model<Invite>,
    private workspacesService: WorkspacesService,
    private usersService: UsersService,
    private notificationsGateway: NotificationsGateway,
    private notificationEventsService: NotificationEventsService,
    private projectsService: ProjectsService,
  ) {}

  /**
   * Generate a unique invitation token
   */
  private generateInviteToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create a new invitation
   */
  async create(
    createInviteDto: CreateInviteDto,
    userId: string,
  ): Promise<InviteResponseDto> {
    // Verify the workspace exists and user has permission to invite
    const workspace = await this.workspacesService.findById(
      createInviteDto.workspaceId,
      userId,
    );

    // Check if the user has permission to invite others (must be admin or owner)
    const hasPermission = await this.workspacesService.checkPermission(
      createInviteDto.workspaceId,
      userId,
      ['owner', 'admin'],
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        'You do not have permission to invite users to this workspace',
      );
    }

    // Check if invitee exists
    const invitee = await this.usersService.getUserById(
      createInviteDto.inviteeId,
    );
    if (!invitee) {
      throw new NotFoundException(
        `User with ID ${createInviteDto.inviteeId} not found`,
      );
    }

    // Check if the invitee is already in the workspace
    const isAlreadyMember = workspace.members.some((member) => {
      if (typeof member === 'object' && member.userId) {
        return member.userId.toString() === createInviteDto.inviteeId;
      }
      return member.toString() === createInviteDto.inviteeId;
    });

    if (isAlreadyMember) {
      throw new ConflictException('User is already a member of this workspace');
    }

    // Check if there's an existing pending invitation
    const existingInvite = await this.inviteModel.findOne({
      inviteeId: new Types.ObjectId(createInviteDto.inviteeId),
      workspaceId: new Types.ObjectId(createInviteDto.workspaceId),
      status: 'pending',
    });

    if (existingInvite) {
      throw new ConflictException(
        'An invitation is already pending for this user',
      );
    }

    // Generate a token and set expiration time (24 hours from now)
    const inviteToken = this.generateInviteToken();
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);

    // Convert selected projects to ObjectIds if they exist
    const selectedProjects = createInviteDto.selectedProjects
      ? createInviteDto.selectedProjects.map(
          (projectId) => new Types.ObjectId(projectId),
        )
      : [];

    // Create the invitation
    const newInvite = new this.inviteModel({
      inviterId: new Types.ObjectId(userId),
      inviteeId: new Types.ObjectId(createInviteDto.inviteeId),
      workspaceId: new Types.ObjectId(createInviteDto.workspaceId),
      selectedProjects,
      role: createInviteDto.role || 'member',
      inviteToken,
      expirationTime,
    });

    const savedInvite = await newInvite.save();

    const inviter = await this.usersService.getUserById(userId);

    // Create response object
    const responseData = {
      id: savedInvite._id.toString(),
      inviterId: savedInvite.inviterId.toString(),
      inviterName: inviter.fullName,
      inviteeId: savedInvite.inviteeId.toString(),
      inviteeName: invitee.fullName,
      workspaceId: savedInvite.workspaceId.toString(),
      workspaceName: workspace.name,
      status: savedInvite.status,
      inviteTime: savedInvite.inviteTime,
      expirationTime: savedInvite.expirationTime,
      inviteToken: savedInvite.inviteToken,
    };

    // Send real-time notification to the invitee
    this.notificationsGateway.sendInviteNotification(
      savedInvite.inviteeId.toString(),
      {
        id: savedInvite._id.toString(),
        inviterId: inviter._id.toString(),
        inviterName: inviter.fullName,
        workspaceId: workspace._id.toString(),
        workspaceName: workspace.name,
        inviteToken: savedInvite.inviteToken,
      },
    );

    // Create a persistent notification for the user
    await this.notificationEventsService.onInviteReceived(
      savedInvite.inviteeId.toString(),
      inviter._id.toString(),
      inviter.fullName,
      workspace._id.toString(),
      workspace.name,
    );

    return responseData;
  }

  /**
   * Accept an invitation using the token
   */
  async acceptInvite(
    acceptInviteDto: AcceptInviteDto,
    userId: string,
  ): Promise<InviteResponseDto> {
    // Find the invitation by token
    const invite = await this.inviteModel.findOne({
      inviteToken: acceptInviteDto.inviteToken,
    });

    if (!invite) {
      throw new NotFoundException('Invitation not found');
    }

    // Verify the invitation is for the current user
    if (invite.inviteeId.toString() !== userId) {
      throw new UnauthorizedException('This invitation is not for you');
    }

    // Check if invitation has expired
    if (invite.expirationTime < new Date()) {
      // Update status to expired
      invite.status = 'expired';
      await invite.save();
      throw new BadRequestException('This invitation has expired');
    }

    // Check if invitation is still pending
    if (invite.status !== 'pending') {
      throw new BadRequestException(
        `This invitation is already ${invite.status}`,
      );
    }

    // Add the user to the workspace
    const workspace = await this.workspacesService.addMember(
      invite.workspaceId.toString(),
      {
        userId,
        role: (invite.role as WorkspaceRole) || 'member',
      },
      invite.inviterId.toString(),
    );

    // If invitation includes project access, add user to those projects
    if (invite.selectedProjects && invite.selectedProjects.length > 0) {
      const invitee = await this.usersService.getUserById(userId);
      const inviter = await this.usersService.getUserById(
        invite.inviterId.toString(),
      );

      // Add detailed debugging for project IDs
      console.log(
        'INVITE DEBUG: Raw selectedProjects from invite:',
        invite.selectedProjects,
      );

      // Check the type and structure of each project ID
      invite.selectedProjects.forEach((projectId, index) => {
        console.log(`INVITE DEBUG: Project ID ${index}:`, {
          value: projectId,
          type: typeof projectId,
          isObjectId: projectId instanceof Types.ObjectId,
          toString: projectId.toString(),
          hasToHexString: typeof projectId.toHexString === 'function',
          hexString:
            typeof projectId.toHexString === 'function'
              ? projectId.toHexString()
              : 'N/A',
        });
      });

      console.log(
        `Invitation includes ${invite.selectedProjects.length} projects: ${JSON.stringify(invite.selectedProjects.map((id) => id.toString()))}`,
      );

      // Add user to each project
      for (const projectId of invite.selectedProjects) {
        try {
          console.log(
            `INVITE DEBUG: Processing project ID ${projectId.toString()}`,
          );

          // First ensure the inviter can access the project (needed for invite-only projects)
          try {
            const projectInfo = await this.projectsService.getProjectById(
              projectId.toString(),
              invite.inviterId.toString(),
            );
            console.log(`INVITE DEBUG: Successfully retrieved project:`, {
              id: projectInfo._id.toString(),
              name: projectInfo.name,
              visibility: projectInfo.visibility,
            });
          } catch (projectError) {
            console.error(
              `INVITE DEBUG: Failed to retrieve project ${projectId}:`,
              projectError.message,
            );
            continue; // Skip to next project if we can't retrieve this one
          }

          // Add user to project with explicit role
          try {
            const addMemberResult = await this.projectsService.addProjectMember(
              projectId.toString(),
              {
                userId,
                role: 'Member',
                userName: invitee.fullName,
              },
              invite.inviterId.toString(),
              {
                userId: invite.inviterId.toString(),
                name: inviter.fullName,
              },
            );

            console.log(
              `Successfully added user to project ${projectId}. Updated project roles:`,
              addMemberResult.roles.map((r) => ({
                userId: r.userId.toString(),
                role: r.role,
              })),
            );

            // Verify the user was actually added to the roles array
            const userAdded = addMemberResult.roles.some(
              (role) => role.userId.toString() === userId,
            );

            if (!userAdded) {
              console.error(
                `User ${userId} wasn't properly added to project ${projectId} roles!`,
              );
            }
          } catch (addMemberError) {
            // Log the specific error for adding a member to help with debugging
            console.error(
              `Failed to add user to project ${projectId} via addProjectMember:`,
              addMemberError.message,
            );

            if (addMemberError.message.includes('already a member')) {
              console.log(
                `User is already a member of project ${projectId}. Skipping.`,
              );
            } else {
              throw addMemberError; // Re-throw the error to be caught by the outer catch
            }
          }
        } catch (error) {
          console.error(
            `Failed to add user to project ${projectId}: ${error.message}`,
          );
          console.error(`INVITE DEBUG: Full error:`, error);
          // Continue with other projects even if one fails
        }
      }
    }

    // Update the invitation status
    invite.status = 'accepted';
    const updatedInvite = await invite.save();

    const inviter = await this.usersService.getUserById(
      invite.inviterId.toString(),
    );
    const invitee = await this.usersService.getUserById(
      invite.inviteeId.toString(),
    );

    // Create a persistent notification for the inviter
    await this.notificationEventsService.onInviteAccepted(
      invite.inviterId.toString(),
      invite.inviteeId.toString(),
      invitee.fullName,
      invite.workspaceId.toString(),
      workspace.name,
    );

    // Create response object
    const responseData = {
      id: updatedInvite._id.toString(),
      inviterId: updatedInvite.inviterId.toString(),
      inviterName: inviter.fullName,
      inviteeId: updatedInvite.inviteeId.toString(),
      inviteeName: invitee.fullName,
      workspaceId: updatedInvite.workspaceId.toString(),
      workspaceName: workspace.name,
      status: updatedInvite.status,
      inviteTime: updatedInvite.inviteTime,
      expirationTime: updatedInvite.expirationTime,
      inviteToken: updatedInvite.inviteToken,
    };

    // Send notification to the inviter that the invite was accepted
    this.notificationsGateway.sendInviteStatusNotification(
      invite.inviterId.toString(),
      {
        id: updatedInvite._id.toString(),
        status: 'accepted',
        workspaceName: workspace.name,
      },
    );

    return responseData;
  }

  /**
   * Get all invitations for a user (sent or received)
   */
  async getInvitesByUser(
    userId: string,
    type: 'sent' | 'received' = 'received',
  ): Promise<InviteResponseDto[]> {
    // Determine which field to query based on type
    const query =
      type === 'sent'
        ? { inviterId: new Types.ObjectId(userId) }
        : { inviteeId: new Types.ObjectId(userId) };

    // Get all invitations that match the query
    const invites = await this.inviteModel
      .find(query)
      .populate('inviterId', 'fullName email')
      .populate('inviteeId', 'fullName email')
      .populate('workspaceId', 'name')
      .exec();

    // Check for expired invites and update them
    const now = new Date();
    const results = await Promise.all(
      invites.map(async (invite) => {
        // If invite is pending but has expired, update its status
        if (invite.status === 'pending' && invite.expirationTime < now) {
          invite.status = 'expired';
          await invite.save();

          // Notify relevant users about expiration
          if (type === 'sent') {
            this.notificationsGateway.sendInviteStatusNotification(userId, {
              id: invite._id.toString(),
              status: 'expired',
              workspaceName: (invite.workspaceId as any).name,
            });
          }
        }

        const inviter = invite.inviterId as any;
        const invitee = invite.inviteeId as any;
        const workspace = invite.workspaceId as any;

        return {
          id: invite._id.toString(),
          inviterId: invite.inviterId.toString(),
          inviterName: inviter.fullName,
          inviteeId: invite.inviteeId.toString(),
          inviteeName: invitee.fullName,
          workspaceId: invite.workspaceId.toString(),
          workspaceName: workspace.name,
          status: invite.status,
          inviteTime: invite.inviteTime,
          expirationTime: invite.expirationTime,
          inviteToken: invite.inviteToken,
        };
      }),
    );

    return results;
  }

  /**
   * Get invitation by ID
   */
  async getInviteById(
    inviteId: string,
    userId: string,
  ): Promise<InviteResponseDto> {
    if (!Types.ObjectId.isValid(inviteId)) {
      throw new BadRequestException('Invalid invite ID');
    }

    const invite = await this.inviteModel
      .findById(inviteId)
      .populate('inviterId', 'fullName email')
      .populate('inviteeId', 'fullName email')
      .populate('workspaceId', 'name')
      .exec();

    if (!invite) {
      throw new NotFoundException(`Invite with ID ${inviteId} not found`);
    }

    // Only the inviter or invitee can view the invite
    if (
      invite.inviterId.toString() !== userId &&
      invite.inviteeId.toString() !== userId
    ) {
      throw new UnauthorizedException(
        'You do not have permission to view this invite',
      );
    }

    // Check if invite has expired
    if (invite.status === 'pending' && invite.expirationTime < new Date()) {
      invite.status = 'expired';
      await invite.save();

      // Notify inviter about expiration
      if (invite.inviterId.toString() === userId) {
        this.notificationsGateway.sendInviteStatusNotification(userId, {
          id: invite._id.toString(),
          status: 'expired',
          workspaceName: (invite.workspaceId as any).name,
        });
      }
    }

    const inviter = invite.inviterId as any;
    const invitee = invite.inviteeId as any;
    const workspace = invite.workspaceId as any;

    return {
      id: invite._id.toString(),
      inviterId: invite.inviterId.toString(),
      inviterName: inviter.fullName,
      inviteeId: invite.inviteeId.toString(),
      inviteeName: invitee.fullName,
      workspaceId: invite.workspaceId.toString(),
      workspaceName: workspace.name,
      status: invite.status,
      inviteTime: invite.inviteTime,
      expirationTime: invite.expirationTime,
      inviteToken: invite.inviteToken,
    };
  }

  /**
   * Cancel/revoke an invitation (inviter only)
   */
  async cancelInvite(inviteId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(inviteId)) {
      throw new BadRequestException('Invalid invite ID');
    }

    const invite = await this.inviteModel
      .findById(inviteId)
      .populate('workspaceId', 'name')
      .populate('inviteeId', 'fullName')
      .exec();

    if (!invite) {
      throw new NotFoundException(`Invite with ID ${inviteId} not found`);
    }

    // Only the inviter can cancel an invitation
    if (invite.inviterId.toString() !== userId) {
      throw new UnauthorizedException(
        'Only the inviter can cancel an invitation',
      );
    }

    // Only pending invitations can be canceled
    if (invite.status !== 'pending') {
      throw new BadRequestException(
        `Cannot cancel an invitation that is already ${invite.status}`,
      );
    }

    // Update status to revoked
    invite.status = 'revoked';
    await invite.save();

    const invitee = invite.inviteeId as any;

    // Create a persistent notification for the invitee
    await this.notificationEventsService.onInviteRejected(
      userId,
      invitee._id.toString(),
      invitee.fullName,
      invite.workspaceId.toString(),
      (invite.workspaceId as any).name,
    );

    // Notify the invitee about the revocation
    this.notificationsGateway.sendInviteStatusNotification(
      invite.inviteeId.toString(),
      {
        id: invite._id.toString(),
        status: 'revoked',
        workspaceName: (invite.workspaceId as any).name,
      },
    );
  }

  /**
   * Check if an invitation token is valid
   */
  async validateInviteToken(token: string): Promise<{
    isValid: boolean;
    workspace?: { id: string; name: string };
    inviter?: { id: string; name: string };
  }> {
    const invite = await this.inviteModel
      .findOne({ inviteToken: token })
      .populate('inviterId', 'fullName')
      .populate('workspaceId', 'name')
      .exec();

    if (!invite) {
      return { isValid: false };
    }

    // Check if invite has expired
    if (invite.status !== 'pending' || invite.expirationTime < new Date()) {
      if (invite.status === 'pending') {
        invite.status = 'expired';
        await invite.save();

        // Notify the inviter that the invite expired
        this.notificationsGateway.sendInviteStatusNotification(
          invite.inviterId.toString(),
          {
            id: invite._id.toString(),
            status: 'expired',
            workspaceName: (invite.workspaceId as any).name,
          },
        );
      }
      return { isValid: false };
    }

    const inviter = invite.inviterId as any;
    const workspace = invite.workspaceId as any;

    return {
      isValid: true,
      workspace: { id: workspace._id.toString(), name: workspace.name },
      inviter: { id: inviter._id.toString(), name: inviter.fullName },
    };
  }

  /**
   * Reject an invitation (invitee only)
   */
  async rejectInvite(inviteId: string, userId: string): Promise<void> {
    if (!Types.ObjectId.isValid(inviteId)) {
      throw new BadRequestException('Invalid invite ID');
    }

    const invite = await this.inviteModel
      .findById(inviteId)
      .populate('workspaceId', 'name')
      .populate('inviterId', 'fullName')
      .exec();

    if (!invite) {
      throw new NotFoundException(`Invite with ID ${inviteId} not found`);
    }

    // Only the invitee can reject an invitation
    if (invite.inviteeId.toString() !== userId) {
      throw new UnauthorizedException(
        'Only the invitee can reject an invitation',
      );
    }

    // Only pending invitations can be rejected
    if (invite.status !== 'pending') {
      throw new BadRequestException(
        `Cannot reject an invitation that is already ${invite.status}`,
      );
    }

    // Update status to rejected
    invite.status = 'revoked';
    await invite.save();

    const inviter = invite.inviterId as any;
    const invitee = await this.usersService.getUserById(userId);

    // Create a persistent notification for the inviter
    await this.notificationEventsService.onInviteRejected(
      inviter._id.toString(),
      userId,
      invitee.fullName,
      invite.workspaceId.toString(),
      (invite.workspaceId as any).name,
    );

    // Notify the inviter about the rejection
    this.notificationsGateway.sendInviteStatusNotification(
      invite.inviterId.toString(),
      {
        id: invite._id.toString(),
        status: 'revoked',
        workspaceName: (invite.workspaceId as any).name,
      },
    );
  }
}
