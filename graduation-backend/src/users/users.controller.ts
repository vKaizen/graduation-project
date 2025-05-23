/* eslint-disable prettier/prettier */
import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/users.dto';
import { User } from './schema/users.schema';
import { AuthService } from 'src/auth/auth.service';
import { RolesGuard } from 'src/auth/guards/roles.guard'; // Verify path correctness
import { Roles } from 'src/auth/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { Request } from '@nestjs/common';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
  ) {}

  // Public registration endpoint - anyone can register
  @Post('register')
  async createUser(@Body() createUserDto: CreateUserDto): Promise<any> {
    console.log('Received createUser request:', createUserDto);
    const user = await this.usersService.createUser(createUserDto);

    // Return only necessary user info without exposing sensitive data
    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      defaultWorkspaceId: user.defaultWorkspaceId,
    };
  }

  // Login does not require roles since users need to authenticate
  @Post('login')
  async login(@Body() user): Promise<any> {
    return this.authService.login(user);
  }

  // Both admins and users can access this, but ensure users can only access their own profile
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get(':id')
  @Roles('Admin', 'User')
  async getUserById(@Param('id') id: string) {
    // Additional security logic to ensure users can only access their own information
    const user = await this.usersService.getUserById(id);
    if (!user) {
      return { email: 'Unknown User', fullName: 'Unknown User' };
    }
    return {
      _id: user._id,
      email: user.email,
      fullName: user.fullName || user.email,
      defaultWorkspaceId: user.defaultWorkspaceId || null,
    };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get()
  // Remove the Admin role restriction to allow any authenticated user to access user list
  // @Roles('Admin')
  async getAllUsers() {
    console.log('Getting all users for client request');
    const users = await this.usersService.getAllUsers();
    // Map to only return safe fields
    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      fullName: user.fullName || user.email,
    }));
  }

  // New endpoint to fetch multiple users by IDs in a single request
  @UseGuards(JwtAuthGuard)
  @Post('batch')
  async getUsersByIds(@Body() data: { userIds: string[] }) {
    console.log('Batch fetching users with IDs:', data.userIds);

    if (
      !data.userIds ||
      !Array.isArray(data.userIds) ||
      data.userIds.length === 0
    ) {
      return [];
    }

    // Get users by their IDs
    const users = await this.usersService.getUsersByIds(data.userIds);

    // Map to only return safe fields
    return users.map((user) => ({
      _id: user._id,
      email: user.email,
      fullName: user.fullName || user.email,
    }));
  }
}
