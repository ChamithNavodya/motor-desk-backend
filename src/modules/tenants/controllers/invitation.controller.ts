import { Controller, Post, Body, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { TenantService } from '../services/tenant.service.js';
import { ResponseMessage } from '../../../decorators/response-message.decorator.js';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard.js';
import { RolesGuard } from '../../auth/roles.guard.js';
import { Roles } from '../../auth/roles.decorator.js';
import { OnboardTenantDto, AcceptInvitationDto, ValidateOwnerInvitationDto } from '../dto/invitation.dto.js';

@ApiTags('Invitations & Onboarding')
@Controller('invitations')
export class InvitationController {
  constructor(private tenantService: TenantService) {}

  @Post('onboard')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superadmin')
  @ApiOperation({ summary: 'Initiate a new tenant onboarding' })
  @ApiResponse({ status: 201, description: 'Tenant record created and invitation sent.' })
  @ResponseMessage('Tenant onboarding initiated')
  async onboardTenant(@Body() dto: OnboardTenantDto) {
    return this.tenantService.initiateOnboarding(dto.name, dto.ownerEmail);
  }

  @Post('validate-owner-invitation')
  @ApiOperation({ summary: 'Validate an invitation token' })
  @ApiResponse({ status: 200, description: 'Token is valid.' })
  @ResponseMessage('Invitation validated')
  async validateInvitation(@Body() dto: ValidateOwnerInvitationDto) {
    const invitation = await this.tenantService.validateInvitation(dto.token);
    return {
      email: invitation.email,
      tenantName: invitation.tenant.name,
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Complete onboarding for a tenant' })
  @ApiResponse({ status: 200, description: 'Onboarding completed and user created.' })
  @ResponseMessage('Onboarding completed successfully')
  async completeOnboarding(@Body() dto: AcceptInvitationDto) {
    if (dto.password !== dto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }
    return this.tenantService.completeOnboarding(dto.token, dto.password);
  }
}
