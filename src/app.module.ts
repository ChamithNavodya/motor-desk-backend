import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import { getLoggerConfig } from './config/logger.config';
import { TenantModule } from './central/tenant.module';
import { AuthModule } from './auth/auth.module';
import { TenantController } from './central/controllers/tenant.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => getLoggerConfig(configService),
    }),
    TenantModule,
    AuthModule,
  ],
  controllers: [AppController, TenantController],
  providers: [AppService],
})
export class AppModule {}
