import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from 'nestjs-pino';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { TenantService } from './central/services/tenant.service';

export async function loadApplication() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  const logger = app.get(Logger);
  app.useLogger(logger);

  app.enableCors();

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));

  app.setGlobalPrefix('api/v1');

  app.useGlobalInterceptors(new ResponseInterceptor(app.get(Reflector)));
  app.useGlobalFilters(new GlobalExceptionFilter());

  const tenantService = app.get(TenantService);
  app.use(new TenantMiddleware(tenantService).use.bind(new TenantMiddleware(tenantService)));

  await app.init();
  return { app, logger };
}

async function bootstrap() {
  const { app, logger } = await loadApplication();
  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  app.enableShutdownHooks();

  logger.log(`Application is running on: http://localhost:${port}`, 'App');
  logger.log(`Current Environment: ${configService.get<string>('NODE_ENV')}`, 'App');
}

if (require.main === module) {
  bootstrap().catch((error) => {
    console.error('Application failed to start:', error);
    process.exit(1);
  });
}
