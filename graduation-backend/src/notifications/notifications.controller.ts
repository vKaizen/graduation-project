import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { Notification } from './schema/notifications.schema';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new notification' })
  @ApiResponse({
    status: 201,
    description: 'The notification has been successfully created.',
  })
  create(@Body() createNotificationDto: CreateNotificationDto) {
    return this.notificationsService.create(createNotificationDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Return all notifications for the current user',
  })
  findAllForUser(@Req() req) {
    const userId = req.user.userId;
    console.log('Controller: Getting notifications for user:', userId);
    console.log('JWT user data:', req.user);
    console.log('User object data type:', typeof req.user);
    console.log('UserId data type:', typeof userId);

    return this.notificationsService.findAllForUser(userId);
  }

  @Get('unread')
  @ApiOperation({
    summary: 'Get all unread notifications for the current user',
  })
  @ApiResponse({
    status: 200,
    description: 'Return all unread notifications for the current user',
  })
  findUnreadForUser(@Req() req) {
    const userId = req.user.userId;
    return this.notificationsService.findUnreadForUser(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({
    status: 200,
    description: 'The notification has been successfully marked as read',
  })
  markAsRead(@Param('id') id: string) {
    return this.notificationsService.markAsRead(id);
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 200,
    description: 'All notifications have been successfully marked as read',
  })
  markAllAsRead(@Req() req) {
    const userId = req.user.userId;
    return this.notificationsService.markAllAsRead(userId);
  }

  @Delete()
  @ApiOperation({ summary: 'Delete all notifications for the current user' })
  @ApiResponse({
    status: 200,
    description: 'All notifications have been successfully deleted',
  })
  deleteAll(@Req() req) {
    const userId = req.user.userId;
    return this.notificationsService.deleteAllForUser(userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a notification by ID' })
  @ApiResponse({
    status: 200,
    description: 'The notification has been deleted.',
  })
  async deleteById(@Param('id') id: string): Promise<void> {
    return this.notificationsService.deleteById(id);
  }
}
