import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { getLoggerConfig } from './config/logger.config.js';
import { TenantManagementModule } from './modules/tenants/tenant-management.module.js';
import { SuperadminModule } from './modules/superadmin/superadmin.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { LoggingInterceptor } from './interceptors/logging.interceptor.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getLoggerConfig(configService),
    }),
    TenantManagementModule,
    SuperadminModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoggingInterceptor],
})
export class AppModule {}