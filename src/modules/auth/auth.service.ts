import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TenantService } from '../tenants/services/tenant.service.js';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private tenantService: TenantService,
    private jwtService: JwtService,
  ) {}

  async loginCentral(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (user.role !== 'superadmin') {
      throw new UnauthorizedException('Access denied: Central login required');
    }
    return this.generateToken(user);
  }

  async loginOwner(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (user.role === 'superadmin' || !user.tenantId)
      throw new UnauthorizedException('Access denied: Tenant login required');
    return this.generateToken(user);
  }

  private async validateUser(email: string, password: string) {
    const prisma = this.tenantService.getCentralPrisma();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    return user;
  }

  private generateToken(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    };
  }
}
