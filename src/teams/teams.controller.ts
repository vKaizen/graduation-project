/* eslint-disable prettier/prettier */


import { Controller, Post, Get, Body, Param, Put,  Headers, UseGuards } from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/teams.dto';
import { Team } from './schema/teams.schema';
import { UpdateTeamDto } from './dto/updateTeam.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';



@Controller('teams')

export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post('create')
  @UseGuards(JwtAuthGuard) 
  @Post()
async createTeam(@Body() createTeamDto: CreateTeamDto, @Headers("Authorization") auth: string): Promise<Team> {
  const token = auth.split(" ")[1]
  const userData = token
  return this.teamsService.createTeam(createTeamDto,);
}

  @Get()
  async getAllTeams(): Promise<Team[]> {
    return this.teamsService.getAllTeams();
  }

  @Get(':id')
  async getTeamById(@Param('id') id: string): Promise<Team> {
    return this.teamsService.getTeamById(id);
  }

  @Put(':id')
  async updateTeam(@Param('id') id: string, @Body() updateTeamDto: UpdateTeamDto) {
      return this.teamsService.updateTeam(id, updateTeamDto);
  }
}