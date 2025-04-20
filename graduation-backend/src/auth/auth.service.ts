/* eslint-disable prettier/prettier */
import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { UserDocument } from '../users/schema/users.schema';

// Adjusted to reflect your user document and include only the necessary fields
export type SanitizedUser = {
  userId: string; // Assuming '_id' is the MongoDB default identifier
  username: string; // Assuming 'email' is used as username
  role: string[]; // Assuming 'roles' is correct and it's an array
  defaultWorkspaceId?: string; // User's default workspace
};

@Injectable()
export class AuthService {
  private readonly loginAttempts = new Map<string, number>();
  private readonly maxLoginAttempts = 5;

  constructor(
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(email: string, pass: string): Promise<SanitizedUser> {
    const user = await this.usersService.findOneByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials, user not found');
    }

    if (!(await this.isPasswordValid(pass, user.password))) {
      this.handleFailedLoginAttempt(email);
      throw new UnauthorizedException('Invalid credentials, wrong password');
    }

    this.resetLoginAttempts(email);
    return this.sanitizeUser(user);
  }

  private handleFailedLoginAttempt(email: string): void {
    const attempts = this.loginAttempts.get(email) || 0;
    if (attempts >= this.maxLoginAttempts) {
      throw new HttpException(
        'Account locked due to too many failed login attempts',
        HttpStatus.FORBIDDEN,
      );
    }
    this.loginAttempts.set(email, attempts + 1);
  }

  private resetLoginAttempts(email: string): void {
    this.loginAttempts.delete(email);
  }

  private sanitizeUser(user: UserDocument): SanitizedUser {
    return {
      userId: user._id.toString(), // Convert MongoDB ObjectId to string
      username: user.email, // Assuming email is used as username
      role: [user.role], // Ensure this is included and correct based on your schema
      defaultWorkspaceId: user.defaultWorkspaceId
        ? user.defaultWorkspaceId.toString()
        : undefined,
    };
  }

  private async isPasswordValid(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainTextPassword, hashedPassword);
  }

  async login(user: {
    email: string;
    password: string;
  }): Promise<{
    accessToken: string;
    userId: string;
    username: string;
    defaultWorkspaceId?: string;
  }> {
    const validatedUser = await this.validateUser(user.email, user.password);
    if (!validatedUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = {
      username: validatedUser.username,
      sub: validatedUser.userId,
      roles: [validatedUser.role], // Ensure this is included
      defaultWorkspaceId: validatedUser.defaultWorkspaceId,
    };

    console.log('Creating token with payload:', payload);

    return {
      accessToken: this.jwtService.sign(payload),
      userId: validatedUser.userId,
      username: validatedUser.username,
      defaultWorkspaceId: validatedUser.defaultWorkspaceId,
    };
  }

  private extractUserIdFromToken(token: string): string | null {
    try {
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      if (payload && payload.sub) {
        return payload.sub;
      }

      return null;
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' &&
        error.message === 'invalid signature'
      ) {
        return null;
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    }
  }

  async decodeToken(token: string): Promise<any> {
    try {
      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET,
      });

      return decoded;
    } catch (error) {
      if (
        error.name === 'JsonWebTokenError' &&
        error.message === 'invalid signature'
      ) {
      } else {
        throw new UnauthorizedException('Invalid token');
      }
    }
  }
}
