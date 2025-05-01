/* eslint-disable prettier/prettier */

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Comment } from './schema/comments.schema';
import { CreateCommentDto } from './dto/comments.dto';
import { NotificationEventsService } from '../notifications/notification-events.service';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<Comment>,
    private notificationEventsService: NotificationEventsService,
  ) {}

  async createComment(createCommentDto: CreateCommentDto): Promise<Comment> {
    const newComment = new this.commentModel(createCommentDto);
    const savedComment = await newComment.save();

    // Get the task's assignee and creator to notify them about the comment
    if (savedComment.task) {
      try {
        // We need to populate task details to get taskTitle, assignee and creator
        // This assumes your Task model has these fields
        const task = await this.commentModel.db
          .model('Task')
          .findById(savedComment.task)
          .select('title assignee createdBy')
          .exec();

        if (task) {
          // Create a short snippet of the comment
          const commentSnippet =
            savedComment.content.length > 100
              ? savedComment.content.substring(0, 97) + '...'
              : savedComment.content;

          // Notify task assignee if they're different from commenter
          if (
            task.assignee &&
            task.assignee.toString() !== savedComment.author.toString()
          ) {
            await this.notificationEventsService.onCommentAdded(
              task.assignee.toString(),
              savedComment.author.toString(),
              savedComment.authorName || 'A team member',
              task._id.toString(),
              task.title,
              savedComment._id.toString(),
              commentSnippet,
            );
          }

          // Notify task creator if they're different from commenter and assignee
          if (
            task.createdBy &&
            task.createdBy.toString() !== savedComment.author.toString() &&
            (!task.assignee ||
              task.createdBy.toString() !== task.assignee.toString())
          ) {
            await this.notificationEventsService.onCommentAdded(
              task.createdBy.toString(),
              savedComment.author.toString(),
              savedComment.authorName || 'A team member',
              task._id.toString(),
              task.title,
              savedComment._id.toString(),
              commentSnippet,
            );
          }
        }
      } catch (error) {
        console.error('Error sending comment notifications:', error);
        // Continue without notifications if there's an error
      }
    }

    return savedComment;
  }

  async getCommentsByTaskId(taskId: string): Promise<Comment[]> {
    return this.commentModel.find({ task: taskId }).exec();
  }
}
