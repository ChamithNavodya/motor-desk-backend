import { Module, Global } from '@nestjs/common';
import { TenantService } from './services/tenant.service';
import { TenantMiddleware } from '../common/middleware/tenant.middleware';

@Global()
@Module({
  providers: [TenantService, TenantMiddleware],
  exports: [TenantService, TenantMiddleware],
})
export class TenantModule {}
