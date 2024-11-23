/* eslint-disable prettier/prettier */


import { Types } from 'mongoose';

export class CreateCommentDto {
  readonly content: string;
  readonly author: Types.ObjectId;
  readonly task: Types.ObjectId;
}