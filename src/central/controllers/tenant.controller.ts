import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { TenantService } from '../services/tenant.service';
import { ResponseMessage } from '../../decorators/response-message.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { CreateTenantDto, CreateInvitationDto } from '../dto/tenant.dto';

@Controller('tenants')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TenantController {
  constructor(private tenantService: TenantService) {}

  @Post()
  @Roles('superadmin')
  @ResponseMessage('Tenant created successfully')
  async createTenant(@Body() dto: CreateTenantDto) {
    const result = await this.tenantService.createTenantWithSchema(dto.name, dto.ownerEmail);
    return result;
  }

  @Post('invite')
  @Roles('superadmin')
  @ResponseMessage('Invitation sent successfully')
  async createInvitation(@Body() dto: CreateInvitationDto) {
    const token = await this.tenantService.createInvitation(dto.tenantId, dto.email);
    return { token };
  }

  @Get()
  @Roles('superadmin')
  async getAllTenants() {
    return this.tenantService.getAllTenants();
  }
}
