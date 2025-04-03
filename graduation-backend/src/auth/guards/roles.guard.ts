/* eslint-disable prettier/prettier */
import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
    
    if (!requiredRoles) {
      return true;  // No roles required for this route
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    


    console.log("Required roles:", requiredRoles);
    console.log("User roles from request:", user.roles);
    if (!user || !user.roles || !Array.isArray(user.roles)) {
      console.error('Roles or user object is undefined:', user);
      throw new UnauthorizedException('No access rights');
    }

    return requiredRoles.some(role => user.roles.includes(role));
  }
}

