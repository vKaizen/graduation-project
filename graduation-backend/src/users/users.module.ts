/* eslint-disable prettier/prettier */

import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User, UserSchema } from './schema/users.schema';
import { JwtService } from '@nestjs/jwt';
import { AuthModule } from 'src/auth/auth.module';
import { WorkspacesModule } from 'src/workspaces/workspaces.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    forwardRef(() => AuthModule),
    forwardRef(() => WorkspacesModule),
  ],
  controllers: [UsersController],
  providers: [UsersService, JwtService],
  exports: [UsersService],
})
export class UsersModule {}
