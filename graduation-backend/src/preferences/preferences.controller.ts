/* eslint-disable prettier/prettier */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { PreferencesService } from './preferences.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Preferences, DashboardCard } from './schema/preferences.schema';

@Controller('preferences')
export class PreferencesController {
  constructor(private readonly preferencesService: PreferencesService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getUserPreferences(@Request() req): Promise<Preferences> {
    return this.preferencesService.findOrCreateByUserId(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch()
  async updatePreferences(
    @Request() req,
    @Body() preferences: Partial<Preferences>,
  ): Promise<Preferences> {
    return this.preferencesService.updateByUserId(req.user.userId, preferences);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('background-color')
  async updateBackgroundColor(
    @Request() req,
    @Body('backgroundColor') backgroundColor: string,
  ): Promise<Preferences> {
    return this.preferencesService.updateBackgroundColor(
      req.user.userId,
      backgroundColor,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('dashboard-layout')
  async getDashboardLayout(
    @Request() req,
  ): Promise<DashboardCard[] | undefined> {
    return this.preferencesService.getDashboardLayout(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('dashboard-layout')
  async updateDashboardLayout(
    @Request() req,
    @Body('dashboardLayout') dashboardLayout: DashboardCard[],
  ): Promise<Preferences> {
    return this.preferencesService.updateDashboardLayout(
      req.user.userId,
      dashboardLayout,
    );
  }
}
