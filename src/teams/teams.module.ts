/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TeamSchema } from './schema/teams.schema';
import { TeamsService } from './teams.service';
import { TeamsController } from './teams.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: 'Team', schema: TeamSchema }])],
  providers: [TeamsService],
  controllers: [TeamsController],
})
export class TeamsModule {}