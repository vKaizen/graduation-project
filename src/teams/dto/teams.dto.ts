/* eslint-disable prettier/prettier */


import { Types } from 'mongoose';

export class CreateTeamDto {
  readonly name: string;
  readonly members: Types.ObjectId[];
}