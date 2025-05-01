/* eslint-disable prettier/prettier */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { InvitesService } from './invites.service';
import {
  CreateInviteDto,
  AcceptInviteDto,
  InviteResponseDto,
} from './dto/invites.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('invites')
@UseGuards(JwtAuthGuard)
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  /**
   * Create a new invitation
   * POST /api/invites
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createInviteDto: CreateInviteDto,
    @Request() req,
  ): Promise<InviteResponseDto> {
    return this.invitesService.create(createInviteDto, req.user.userId);
  }

  /**
   * Accept an invitation
   * POST /api/invites/accept
   */
  @Post('accept')
  @HttpCode(HttpStatus.OK)
  async acceptInvite(
    @Body() acceptInviteDto: AcceptInviteDto,
    @Request() req,
  ): Promise<InviteResponseDto> {
    return this.invitesService.acceptInvite(acceptInviteDto, req.user.userId);
  }

  /**
   * Get invitations for the current user
   * GET /api/invites
   * Query params: type=sent|received (default: received)
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async findAllForUser(
    @Request() req,
    @Query('type') type: 'sent' | 'received' = 'received',
  ): Promise<InviteResponseDto[]> {
    return this.invitesService.getInvitesByUser(req.user.userId, type);
  }

  /**
   * Get a specific invitation
   * GET /api/invites/:id
   */
  @Get(':id')
  @HttpCode(HttpStatus.OK)
  async findOne(
    @Param('id') id: string,
    @Request() req,
  ): Promise<InviteResponseDto> {
    return this.invitesService.getInviteById(id, req.user.userId);
  }

  /**
   * Cancel/revoke an invitation (only for inviter)
   * DELETE /api/invites/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async cancel(@Param('id') id: string, @Request() req): Promise<void> {
    return this.invitesService.cancelInvite(id, req.user.userId);
  }

  /**
   * Validate an invitation token without accepting it
   * GET /api/invites/validate/:token
   */
  @Get('validate/:token')
  @HttpCode(HttpStatus.OK)
  async validateToken(@Param('token') token: string): Promise<{
    isValid: boolean;
    workspace?: { id: string; name: string };
    inviter?: { id: string; name: string };
  }> {
    return this.invitesService.validateInviteToken(token);
  }
}
