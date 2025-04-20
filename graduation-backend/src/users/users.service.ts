/* eslint-disable prettier/prettier */
import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User } from './schema/users.schema';
import { CreateUserDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';
import { WorkspacesService } from 'src/workspaces/workspaces.service';

@Injectable()
export class UsersService {
  // Add valid roles as a class property
  private readonly validRoles = ['Admin', 'Member', 'Guest'];

  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @Inject(forwardRef(() => WorkspacesService))
    private workspacesService: WorkspacesService,
  ) {}

  // Method to validate roles
  private validateUserRole(role: string): boolean {
    return this.validRoles.includes(role);
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    try {
      console.log('Creating user with data:', {
        ...createUserDto,
        password: '[REDACTED]',
      });

      // Hash password
      const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

      // Create user
      const newUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword,
      });

      // Save user to get an ID
      const savedUser = await newUser.save();
      console.log('User created successfully with ID:', savedUser._id);

      // Create personal workspace for new user
      const workspaceName = `${savedUser.fullName}'s Workspace`;
      console.log('Creating personal workspace:', workspaceName);

      // Create a workspace with the user as owner
      const workspace = await this.workspacesService.create(
        { name: workspaceName },
        savedUser._id.toString(),
      );
      console.log('Workspace created successfully:', {
        id: workspace._id,
        name: workspace.name,
        owner: workspace.owner,
        members: workspace.members,
      });

      // Update user with default workspace
      console.log('Updating user with default workspace reference...');
      savedUser.defaultWorkspaceId = workspace._id as unknown as Types.ObjectId;
      await savedUser.save();
      console.log('User updated with default workspace');

      // Verify the workspace was created correctly
      const verifiedWorkspace = await this.workspacesService.findById(
        workspace._id.toString(),
        savedUser._id.toString(),
        true, // Skip access check during creation
      );
      console.log('Verified workspace:', {
        id: verifiedWorkspace._id,
        name: verifiedWorkspace.name,
        owner: verifiedWorkspace.owner,
        members: verifiedWorkspace.members,
      });

      return savedUser;
    } catch (error) {
      console.error('Error creating user with workspace:', error);
      throw error;
    }
  }

  async getUserById(userId: string): Promise<User> {
    return this.userModel.findById(userId).exec();
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async getAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }
}
