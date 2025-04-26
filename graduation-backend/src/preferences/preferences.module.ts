/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PreferencesService } from './preferences.service';
import { PreferencesController } from './preferences.controller';
import { Preferences, PreferencesSchema } from './schema/preferences.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Preferences.name, schema: PreferencesSchema },
    ]),
  ],
  controllers: [PreferencesController],
  providers: [PreferencesService],
  exports: [PreferencesService], // Export the service so other modules can use it
})
export class PreferencesModule {}
