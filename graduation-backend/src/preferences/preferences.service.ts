/* eslint-disable prettier/prettier */
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Preferences, DashboardCard } from './schema/preferences.schema';
import { PreferencesDto } from './dto/preferences.dto';

@Injectable()
export class PreferencesService {
  constructor(
    @InjectModel(Preferences.name) private preferencesModel: Model<Preferences>,
  ) {}

  async findById(id: string): Promise<Preferences> {
    const preferences = await this.preferencesModel.findById(id);
    if (!preferences) {
      throw new NotFoundException(`Preferences with ID ${id} not found`);
    }
    return preferences;
  }

  async findByUserId(userId: string): Promise<Preferences> {
    const preferences = await this.preferencesModel.findOne({
      userId: new Types.ObjectId(userId),
    });
    return preferences;
  }

  async create(preferencesDto: PreferencesDto): Promise<Preferences> {
    const newPreferences = new this.preferencesModel(preferencesDto);
    return await newPreferences.save();
  }

  async update(
    id: string,
    preferencesDto: Partial<PreferencesDto>,
  ): Promise<Preferences> {
    const updatedPreferences = await this.preferencesModel.findByIdAndUpdate(
      id,
      preferencesDto,
      { new: true },
    );
    if (!updatedPreferences) {
      throw new NotFoundException(`Preferences with ID ${id} not found`);
    }
    return updatedPreferences;
  }

  async updateByUserId(
    userId: string,
    preferences: Partial<Preferences>,
  ): Promise<Preferences> {
    // First get the preferences
    const existingPreferences = await this.findOrCreateByUserId(userId);

    // Don't include _id or userId in the update
    const { _id, userId: _, ...updateData } = preferences as any;

    // Apply the updates
    Object.assign(existingPreferences, updateData);

    // Save the changes
    return await existingPreferences.save();
  }

  async findOrCreateByUserId(userId: string): Promise<Preferences> {
    let preferences = await this.findByUserId(userId);

    if (!preferences) {
      // Create default preferences for the user if not found
      preferences = await this.create({
        userId: new Types.ObjectId(userId),
        uiPreferences: {},
        notificationPreferences: {
          emailNotifications: true,
          pushNotifications: true,
        },
      });
    }

    return preferences;
  }

  async updateBackgroundColor(
    userId: string,
    backgroundColor: string,
  ): Promise<Preferences> {
    const preferences = await this.findOrCreateByUserId(userId);

    // Update the backgroundColor field
    preferences.uiPreferences = {
      ...preferences.uiPreferences,
      backgroundColor,
    };

    return await preferences.save();
  }

  async updateDashboardLayout(
    userId: string,
    dashboardLayout: DashboardCard[],
  ): Promise<Preferences> {
    const preferences = await this.findOrCreateByUserId(userId);

    // Update the dashboardLayout field
    preferences.uiPreferences = {
      ...preferences.uiPreferences,
      dashboardLayout,
    };

    return await preferences.save();
  }

  async getDashboardLayout(
    userId: string,
  ): Promise<DashboardCard[] | undefined> {
    const preferences = await this.findByUserId(userId);
    return preferences?.uiPreferences?.dashboardLayout;
  }
}
