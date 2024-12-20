/* eslint-disable prettier/prettier */

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProjectSchema } from './schema/projects.schema';
import { ProjectsService } from './projects.service';
import { AuthModule } from 'src/auth/auth.module';
import { ProjectsController } from './projects.controller';

@Module({
  imports: [
    AuthModule,
    MongooseModule.forFeature([{ name: 'Project', schema: ProjectSchema }]),
  ],
  controllers: [ProjectsController],
  providers: [ProjectsService],
  exports: [MongooseModule],
})
export class ProjectsModule {}
