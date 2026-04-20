import { Injectable, NestMiddleware, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { TenantService } from '../../central/services/tenant.service';

export interface TenantRequest extends Request {
  tenantId?: string;
  tenantDb?: any;
}

const PUBLIC_PATHS = ['/api/v1/auth/login', '/api/v1/auth/register'];

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private tenantService: TenantService) {}

  async use(req: TenantRequest, res: Response, next: NextFunction) {
    const path = req.path;

    if (PUBLIC_PATHS.includes(path)) {
      return next();
    }

    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return next();
    }

    const tenant = await this.tenantService.getTenantById(tenantId);

    if (!tenant) throw new HttpException('Tenant not found', HttpStatus.NOT_FOUND);

    if (tenant.status !== 'active') throw new HttpException('Tenant is suspended or inactive', HttpStatus.FORBIDDEN);

    const tenantDb = await this.tenantService.getTenantConnection(tenantId);
    req.tenantId = tenantId;
    req.tenantDb = tenantDb;

    next();
  }
}
