/* eslint-disable prettier/prettier */
import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from '../dto/create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {}