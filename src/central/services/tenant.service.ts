import { Injectable, OnModuleInit, OnModuleDestroy, Logger, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Role } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

const DEFAULT_EXPENSE_CATEGORIES = [
  'Fuel',
  'Maintenance',
  'Insurance',
  'Repair',
  'Parking',
  'Toll',
  'Washing',
  'Other',
];

@Injectable()
export class TenantService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TenantService.name);
  private centralPrisma: PrismaClient;
  private tenantConnections: Map<string, { pool: Pool; schemaName: string }> = new Map();
  private pool: Pool;

  constructor(private configService: ConfigService) {
    const databaseUrl = this.configService.get<string>('DATABASE_URL')!;
    this.pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(this.pool);
    this.centralPrisma = new PrismaClient({ adapter });
  }

  async onModuleInit() {
    await this.centralPrisma.$connect();
  }

  async onModuleDestroy() {
    await this.centralPrisma.$disconnect();
    await this.pool.end();
    for (const conn of this.tenantConnections.values()) {
      await conn.pool.end();
    }
  }

  async createTenantWithSchema(name: string, ownerEmail: string) {
    const schemaName = this.toSchemaName(name);

    const existingTenant = await this.centralPrisma.tenant.findUnique({
      where: { name },
    });

    if (existingTenant) throw new Error('Tenant with this name already exists');

    await this.createTenantSchema(schemaName);

    await this.createTenantTables(schemaName);

    const tenant = await this.centralPrisma.tenant.create({
      data: { name, schemaName, status: 'active' },
    });

    await this.seedDefaultCategories(schemaName);
    const token = await this.createInvitation(tenant.id, ownerEmail);
    return { tenant, token };
  }

  private toSchemaName(name: string): string {
    return name
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');
  }

  private async createTenantSchema(schemaName: string) {
    await this.pool.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);
  }

  private async createTenantTables(schemaName: string) {
    const tables = [
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."User" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'owner',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Vehicle" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        make VARCHAR(100) NOT NULL,
        model VARCHAR(100) NOT NULL,
        year INTEGER NOT NULL,
        vin VARCHAR(50) UNIQUE NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        status VARCHAR(50) DEFAULT 'available',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."ExpenseCategory" (
        id VARCHAR(50) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Expense" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        amount DECIMAL(12,2) NOT NULL,
        description TEXT,
        date DATE NOT NULL,
        "vehicleId" UUID,
        "categoryId" VARCHAR(50),
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Customer" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Supplier" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        address TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Sale" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicleId" UUID NOT NULL,
        "customerId" UUID NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        date DATE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Service" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "vehicleId" UUID NOT NULL,
        description TEXT,
        cost DECIMAL(12,2) NOT NULL,
        date DATE NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Inventory" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "partName" VARCHAR(255) NOT NULL,
        quantity INTEGER NOT NULL,
        price DECIMAL(12,2) NOT NULL,
        "supplierId" UUID,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Branch" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        address TEXT,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS "${schemaName}"."Employee" (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255),
        phone VARCHAR(50),
        salary DECIMAL(12,2) NOT NULL,
        "branchId" UUID NOT NULL,
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      )`,
    ];

    for (const sql of tables) await this.pool.query(sql);
  }

  private async seedDefaultCategories(schemaName: string) {
    for (const categoryName of DEFAULT_EXPENSE_CATEGORIES) {
      await this.pool.query(
        `INSERT INTO "${schemaName}"."ExpenseCategory" (id, name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [categoryName.toLowerCase(), categoryName],
      );
    }
  }

  async createInvitation(tenantId: string, email: string) {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const invitation = await this.centralPrisma.invitation.create({
      data: { email, token, tenantId, status: 'pending', expiresAt },
    });

    return invitation.token;
  }

  async getTenantById(tenantId: string) {
    return this.centralPrisma.tenant.findUnique({ where: { id: tenantId } });
  }

  async getTenantByName(name: string) {
    return this.centralPrisma.tenant.findUnique({ where: { name } });
  }

  async getAllTenants() {
    return this.centralPrisma.tenant.findMany({ include: { invitations: true } });
  }

  async validateInvitation(token: string) {
    const invitation = await this.centralPrisma.invitation.findUnique({
      where: { token },
      include: { tenant: true },
    });

    if (!invitation) throw new Error('Invalid invitation');

    if (invitation.status !== 'pending') throw new Error('Invitation already used or expired');

    if (new Date() > invitation.expiresAt) {
      await this.centralPrisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' },
      });
      throw new Error('Invitation expired');
    }

    return invitation;
  }

  async acceptInvitation(token: string, password: string) {
    const invitation = await this.validateInvitation(token);
    const schemaName = invitation.tenant.schemaName;

    const tenantPool = new Pool({
      connectionString: this.configService.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
    });
    // Create a client that uses the specific schema via search_path
    const urlWithSearchPath = `${this.configService.get<string>('DATABASE_URL')}${
      this.configService.get<string>('DATABASE_URL')!.includes('?') ? '&' : '?'
    }search_path=${schemaName}`;

    const poolForClient = new Pool({
      connectionString: urlWithSearchPath,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(poolForClient);
    const client = new PrismaClient({ adapter });

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const existingUser = await (client as any).user.findUnique({
        where: { email: invitation.email },
      });

      if (existingUser) throw new ConflictException('User with this email already exists in this tenant');

      await (client as any).user.create({
        data: { email: invitation.email, password: hashedPassword, role: Role.owner },
      });
    } finally {
      await client.$disconnect();
      await poolForClient.end();
      await tenantPool.end();
    }

    await this.centralPrisma.invitation.update({
      where: { id: invitation.id },
      data: { status: 'accepted' },
    });

    return { success: true, tenantId: invitation.tenantId };
  }

  private createTenantPrismaClient(schemaName: string): PrismaClient {
    const baseUrl = this.configService.get<string>('DATABASE_URL')!;
    const urlWithSearchPath = baseUrl.includes('?')
      ? `${baseUrl}&search_path=${schemaName}`
      : `${baseUrl}?search_path=${schemaName}`;

    const pool = new Pool({
      connectionString: urlWithSearchPath,
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(pool);
    return new PrismaClient({ adapter });
  }

  async getTenantConnection(tenantId: string): Promise<{ pool: Pool; schemaName: string }> {
    if (this.tenantConnections.has(tenantId)) {
      return this.tenantConnections.get(tenantId)!;
    }

    const tenant = await this.getTenantById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    if (tenant.status !== 'active') throw new Error('Tenant is not active');

    const newPool = new Pool({ connectionString: this.configService.get<string>('DATABASE_URL') });

    const conn = { pool: newPool, schemaName: tenant.schemaName };
    this.tenantConnections.set(tenantId, conn);

    return conn;
  }

  getCentralPrisma(): PrismaClient {
    return this.centralPrisma;
  }

  getSchemaName(tenantId: string): string {
    return tenantId;
  }
}
