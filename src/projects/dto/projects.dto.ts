/* eslint-disable prettier/prettier */

import { Types } from "mongoose";

export class CreateProjectDto {
    readonly name: string;
    readonly description?: string;
    readonly status?: string;
    readonly members?: Types.ObjectId[];
    readonly team?: Types.ObjectId;
    readonly customFields?: Map<string, string>;
  }