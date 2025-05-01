import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification } from './schema/notifications.schema';
import { CreateNotificationDto } from './dto/create-notification.dto';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: Model<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    console.log('Creating notification:', createNotificationDto);
    const newNotification = new this.notificationModel({
      ...createNotificationDto,
      read: false,
    });

    const savedNotification = await newNotification.save();
    console.log(
      'Saved notification with ID:',
      savedNotification._id.toString(),
    );
    console.log(
      'Notification saved for user ID:',
      savedNotification.userId.toString(),
    );

    return savedNotification;
  }

  async findAllForUser(userId: string): Promise<Notification[]> {
    console.log('Finding notifications for user ID:', userId);

    // Log all notifications in the database for debugging
    const allNotifications = await this.notificationModel.find().exec();
    console.log('All notifications in database:', allNotifications);

    // Ensure we can match both string and ObjectId formats
    let userIdToMatch: string | Types.ObjectId = userId;

    // Try to convert to ObjectId if it's a valid ObjectId string
    try {
      if (Types.ObjectId.isValid(userId)) {
        userIdToMatch = new Types.ObjectId(userId);
      }
    } catch (error) {
      console.log('Could not convert userId to ObjectId:', error);
    }

    console.log('Looking for notifications with userIdToMatch:', userIdToMatch);

    // Check both string and ObjectId versions for maximum compatibility
    const notifications = await this.notificationModel
      .find({
        $or: [{ userId: userIdToMatch }, { userId: userId.toString() }],
      })
      .sort({ createdAt: -1 })
      .exec();

    console.log(`Found ${notifications.length} notifications for user`);
    if (notifications.length > 0) {
      console.log('First notification:', notifications[0]);
    }

    return notifications;
  }

  async findUnreadForUser(userId: string): Promise<Notification[]> {
    try {
      if (Types.ObjectId.isValid(userId)) {
        userId = new Types.ObjectId(userId).toString();
      }
    } catch (error) {
      console.log('Could not convert userId to ObjectId:', error);
    }

    return this.notificationModel
      .find({
        userId,
        read: false,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  async markAsRead(notificationId: string): Promise<Notification> {
    return this.notificationModel
      .findByIdAndUpdate(notificationId, { read: true }, { new: true })
      .exec();
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      if (Types.ObjectId.isValid(userId)) {
        userId = new Types.ObjectId(userId).toString();
      }
    } catch (error) {
      console.log('Could not convert userId to ObjectId:', error);
    }

    await this.notificationModel
      .updateMany({ userId, read: false }, { read: true })
      .exec();
  }

  async deleteAllForUser(userId: string): Promise<void> {
    try {
      if (Types.ObjectId.isValid(userId)) {
        userId = new Types.ObjectId(userId).toString();
      }
    } catch (error) {
      console.log('Could not convert userId to ObjectId:', error);
    }

    await this.notificationModel.deleteMany({ userId }).exec();
  }

  async deleteById(notificationId: string): Promise<void> {
    await this.notificationModel.findByIdAndDelete(notificationId);
  }
}
