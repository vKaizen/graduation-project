/* eslint-disable prettier/prettier */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Put,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/teams.dto';
import { Team } from './schema/teams.schema';
import { UpdateTeamDto } from './dto/updateTeam.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { AuthService } from 'src/auth/auth.service';

@Controller('teams')
export class TeamsController {
  constructor(
    private readonly teamsService: TeamsService,
    private readonly authService: AuthService,
  ) {}

  @Post('create')
  @UseGuards(JwtAuthGuard)
  @Post()
  async createTeam(
    @Body() createTeamDto: CreateTeamDto,
    @Headers('Authorization') auth: string,
  ): Promise<Team> {
    const token = auth.split(' ')[1];
    const userData = await this.authService.decodeToken(token);
    const userId = userData.sub;
    return this.teamsService.createTeam(createTeamDto, userId);
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
  async updateTeam(
    @Param('id') id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ) {
    return this.teamsService.updateTeam(id, updateTeamDto);
  }
}
