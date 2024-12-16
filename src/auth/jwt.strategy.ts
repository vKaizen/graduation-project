/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      
      secretOrKey: process.env.JWT_SECRET,
      ignoreExpiration: false,
    });
  }

  async validate(payload: any) {
    console.log("JWT Payload:", payload);

    const rolesArray = Array.isArray(payload.roles) ? payload.roles : [payload.roles].filter(Boolean);
    return { userId: payload.sub, username: payload.username ,  roles: rolesArray};
  }

  
}