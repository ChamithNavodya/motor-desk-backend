import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: { database: HealthCheckItem; memory: HealthCheckItem };
}

export interface HealthCheckItem {
  status: 'up' | 'down';
  responseTime?: number;
  message?: string;
}

@Injectable()
export class AppService implements OnModuleDestroy {
  private readonly startTime: number;
  private prisma: PrismaClient;
  private pool: Pool;

  constructor(private configService: ConfigService) {
    this.startTime = Date.now();
    this.pool = new Pool({
      connectionString: configService.get<string>('DATABASE_URL'),
      ssl: { rejectUnauthorized: false },
    });
    const adapter = new PrismaPg(this.pool);
    this.prisma = new PrismaClient({ adapter });
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
    await this.pool.end();
  }

  async getHealth(): Promise<HealthCheckResult> {
    const [database, memory] = await Promise.all([this.checkDatabase(), this.checkMemory()]);

    const allHealthy = database.status === 'up' && memory.status === 'up';

    return {
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000),
      checks: { database: database, memory: memory },
    };
  }

  private async checkDatabase(): Promise<HealthCheckItem> {
    const start = Date.now();
    try {
      await this.pool.query('SELECT 1');
      return { status: 'up', responseTime: Date.now() - start };
    } catch (error) {
      return { status: 'down', message: error instanceof Error ? error.message : 'Database connection failed' };
    }
  }

  private checkMemory(): Promise<HealthCheckItem> {
    const usage = process.memoryUsage();
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const heapUsedPercent = (usage.heapUsed / usage.heapTotal) * 100;

    const isHealthy = heapUsedPercent < 90;

    return Promise.resolve({
      status: isHealthy ? 'up' : 'down',
      message: `Heap: ${heapUsedMB}MB / ${heapTotalMB}MB (${heapUsedPercent.toFixed(1)}%)`,
    });
  }

  getHello(): string {
    return 'Motor Desk API is running!';
  }
}
