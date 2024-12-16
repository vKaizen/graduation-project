/* eslint-disable prettier/prettier */


import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team } from './schema/teams.schema';
import { CreateTeamDto } from './dto/teams.dto';
import { UpdateTeamDto } from './dto/updateTeam.dto';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<Team>) {}

  async createTeam(createTeamDto: CreateTeamDto, userId: string): Promise<Team> {
    const newTeam = new this.teamModel({
      ...createTeamDto,
      userId,
      owner : [] , // Assigning the user as the leaderS
      members: [] // Optionally, add the creator as the first member
    });
    return newTeam.save();
  }

  async getAllTeams(): Promise<Team[]> {
    return this.teamModel.find().populate('members').exec();
  }

  async getTeamById(teamId: string): Promise<Team> {
    return this.teamModel.findById(teamId).populate('members').exec();
  }


  async updateTeam(teamId: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const updatedTeam = await this.teamModel.findByIdAndUpdate(teamId, updateTeamDto, { new: true });
    if (!updatedTeam) {
        throw new NotFoundException('Team not found');
    }
    return updatedTeam;
}
}