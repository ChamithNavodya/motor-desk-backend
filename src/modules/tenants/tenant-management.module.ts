import { Module, Global } from '@nestjs/common';
import { TenantService } from './services/tenant.service.js';
import { TenantMiddleware } from '../../common/middleware/tenant.middleware.js';
import { TenantController } from './controllers/tenant.controller.js';
import { InvitationController } from './controllers/invitation.controller.js';

@Global()
@Module({
  controllers: [TenantController, InvitationController],
  providers: [TenantService, TenantMiddleware],
  exports: [TenantService, TenantMiddleware],
})
export class TenantManagementModule {}
