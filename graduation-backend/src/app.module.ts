/* eslint-disable prettier/prettier */
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProjectsModule } from './projects/projects.module';
import { SectionsModule } from './sections/sections.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ActivityLogsModule } from './activity-logs/activity-logs.module';
import { PreferencesModule } from './preferences/preferences.module';
import { InvitesModule } from './invites/invites.module';
import { WebsocketsModule } from './websockets/websockets.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRoot(process.env.MONGODB_URI),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    ProjectsModule,
    SectionsModule,
    TasksModule,
    CommentsModule,
    WorkspacesModule,
    ActivityLogsModule,
    PreferencesModule,
    InvitesModule,
    WebsocketsModule,
    NotificationsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
