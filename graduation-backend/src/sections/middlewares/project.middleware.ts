/* eslint-disable prettier/prettier */
// src/sections/middleware/validate-project.middleware.ts
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class ValidateProjectMiddleware implements NestMiddleware {
  async use(req: Request, res: Response, next: NextFunction) {
    const projectId = req.params.projectId;
    // Add your project validation logic here
    // For example, check if the project exists and if the user has access to it
    next();
  }
}