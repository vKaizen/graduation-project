/* eslint-disable prettier/prettier */


import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/comments.dto';
import { Comment } from './schema/comments.schema';

@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  async createComment(@Body() createCommentDto: CreateCommentDto): Promise<Comment> {
    return this.commentsService.createComment(createCommentDto);
  }

  @Get('task/:taskId')
  async getCommentsByTaskId(@Param('taskId') taskId: string): Promise<Comment[]> {
    return this.commentsService.getCommentsByTaskId(taskId);
  }
}