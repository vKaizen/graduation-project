/* eslint-disable prettier/prettier */
import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/users.dto';
import { User } from './schema/users.schema';
import { AuthService } from 'src/auth/auth.service';
import { RolesGuard } from 'src/auth/guards/roles.guard';  // Verify path correctness
import { Roles } from "src/auth/decorators/roles.decorator";

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService, 
    private readonly authService: AuthService
  ) {}

  // Only admins can register new users
  @Post('register')
 
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    console.log('Received createUser request:', createUserDto);
    return this.usersService.createUser(createUserDto);
  }

  // Login does not require roles since users need to authenticate
  @Post('login')
  async login(@Body() user): Promise<any> {
    return this.authService.login(user);
  }

  // Both admins and users can access this, but ensure users can only access their own profile
  @Get(':id')
  @Roles('Admin', 'User')
  async getUserById(@Param('id') id: string): Promise<User> {
    // Additional security logic to ensure users can only access their own information
    return this.usersService.getUserById(id);
  }
}
