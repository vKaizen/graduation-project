/* eslint-disable prettier/prettier */
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schema/users.schema';
import { CreateUserDto } from './dto/users.dto';
import * as bcrypt from 'bcrypt';



@Injectable()
export class UsersService {
  // Add valid roles as a class property
  private readonly validRoles = ['Admin', 'Member', 'Guest'];

  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  // Method to validate roles
  private validateUserRole(role: string): boolean {
    return this.validRoles.includes(role);
  }

  async createUser(createUserDto: CreateUserDto): Promise<User> {
    if (!this.validateUserRole(createUserDto.role)) {
      throw new BadRequestException('Invalid role specified');
    }
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const newUser = new this.userModel({
        ...createUserDto,
        password: hashedPassword
    });
    
    return newUser.save();
  }

  async getUserById(userId: string): Promise<User> {
    return this.userModel.findById(userId).exec();
  }

 

  async findOneByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }
}
