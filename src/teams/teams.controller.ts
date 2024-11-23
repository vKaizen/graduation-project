/* eslint-disable prettier/prettier */


import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/teams.dto';
import { Team } from './schema/teams.schema';

@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  async createTeam(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return this.teamsService.createTeam(createTeamDto);
  }

  @Get()
  async getAllTeams(): Promise<Team[]> {
    return this.teamsService.getAllTeams();
  }

  @Get(':id')
  async getTeamById(@Param('id') id: string): Promise<Team> {
    return this.teamsService.getTeamById(id);
  }
}