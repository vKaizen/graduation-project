/* eslint-disable prettier/prettier */

import { Controller, Request, Post, UseGuards, Get } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth/auth.service';
@Controller()
export class AppController {

  constructor(private authService: AuthService) {}

 
  @UseGuards(AuthGuard('jwt'))
  @Get('protected')
  getProtectedRoute() {
    return "This route is protected and requires a valid JWT";
  }

    @Post('auth/login')
    async login(@Request() req) {
        return this.authService.login(req.user);
    }
  


}
