/* eslint-disable prettier/prettier */


import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './schema/teams.schema';
import { CreateTeamDto } from './dto/teams.dto';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<Team>) {}

  async createTeam(createTeamDto: CreateTeamDto): Promise<Team> {
    const newTeam = new this.teamModel(createTeamDto);
    return newTeam.save();
  }

  async getAllTeams(): Promise<Team[]> {
    return this.teamModel.find().populate('members').exec();
  }

  async getTeamById(teamId: string): Promise<Team> {
    return this.teamModel.findById(teamId).populate('members').exec();
  }
}