/* eslint-disable prettier/prettier */
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    console.log(
      'Initializing JWT Strategy with secret length:',
      jwtSecret?.length || 0,
    );

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: jwtSecret,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    try {
      this.logger.debug(`Validating JWT payload: ${JSON.stringify(payload)}`);

      // Ensure we have a valid user ID
      if (!payload || !payload.sub) {
        this.logger.error('JWT payload missing user ID (sub)');
        throw new UnauthorizedException('Invalid token payload');
      }

      // Parse roles
      const rolesArray = Array.isArray(payload.roles)
        ? payload.roles
        : [payload.roles].filter(Boolean);

      this.logger.debug(`JWT validated for user: ${payload.sub}`);

      return {
        userId: payload.sub,
        username: payload.username,
        roles: rolesArray,
        defaultWorkspaceId: payload.defaultWorkspaceId,
      };
    } catch (error) {
      this.logger.error(`JWT validation error: ${error.message}`);
      throw new UnauthorizedException('Token validation failed');
    }
  }
}
