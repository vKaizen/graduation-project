/* eslint-disable prettier/prettier */
import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*', // Update in production to restrict origins
  },
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('NotificationsGateway');
  private userSocketMap = new Map<string, string[]>(); // Map of userId to socket IDs

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
    // Authentication will happen when the client sends the auth event
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Find and remove the user from the map
    this.userSocketMap.forEach((socketIds, userId) => {
      const index = socketIds.indexOf(client.id);
      if (index !== -1) {
        socketIds.splice(index, 1);
        if (socketIds.length === 0) {
          this.userSocketMap.delete(userId);
        } else {
          this.userSocketMap.set(userId, socketIds);
        }
      }
    });
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(client: Socket, payload: { token: string }): void {
    try {
      // Verify token
      const decodedToken = this.jwtService.verify(payload.token, {
        secret: process.env.JWT_SECRET,
      });
      const userId = decodedToken.sub;

      if (!userId) {
        client.disconnect();
        return;
      }

      // Register the user with this socket
      const existingSockets = this.userSocketMap.get(userId) || [];
      if (!existingSockets.includes(client.id)) {
        existingSockets.push(client.id);
        this.userSocketMap.set(userId, existingSockets);
      }

      this.logger.log(`User ${userId} authenticated with socket ${client.id}`);

      // Join a user-specific room to allow direct messaging
      client.join(`user-${userId}`);

      // Acknowledge successful authentication
      client.emit('authenticated', { success: true });
    } catch (error) {
      this.logger.error(`Authentication error: ${error.message}`);
      client.emit('authenticated', {
        success: false,
        error: 'Authentication failed',
      });
      client.disconnect();
    }
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, type: string, data: any): void {
    if (!userId) {
      this.logger.error('Cannot send notification: No userId provided');
      return;
    }

    // Emit to all sockets in the user's room
    this.server.to(`user-${userId}`).emit('notification', {
      type,
      data,
      timestamp: new Date(),
    });

    this.logger.log(`Notification sent to user ${userId}: ${type}`);
  }

  /**
   * Send an invite notification
   */
  sendInviteNotification(
    inviteeId: string,
    inviteData: {
      id: string;
      inviterId: string;
      inviterName: string;
      workspaceId: string;
      workspaceName: string;
      inviteToken: string;
    },
  ): void {
    this.sendNotificationToUser(inviteeId, 'workspace-invite', inviteData);
  }

  /**
   * Send an invite status update notification
   */
  sendInviteStatusNotification(
    userId: string,
    inviteData: {
      id: string;
      status: string;
      workspaceName: string;
    },
  ): void {
    this.sendNotificationToUser(userId, 'invite-status-changed', inviteData);
  }
}
