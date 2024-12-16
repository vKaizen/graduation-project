/* eslint-disable prettier/prettier */

import { PartialType } from '@nestjs/mapped-types';
import { CreateTeamDto } from './teams.dto';

export class UpdateTeamDto extends PartialType(CreateTeamDto) {}
