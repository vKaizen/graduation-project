/* eslint-disable prettier/prettier */


import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schema/users.schema';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { AuthModule } from 'src/auth/auth.module';
import { TeamsModule } from 'src/teams/teams.module';





@Module({
  imports: [
    TeamsModule,
    MongooseModule.forFeature([{ name: User.name , schema: UserSchema }]),
    forwardRef(() => AuthModule),
  ],
  controllers: [UsersController],
  providers: [UsersService],

  exports: [UsersService]
})
export class UsersModule {}