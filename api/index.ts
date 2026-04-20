import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import type { VercelRequest, VercelResponse } from '@vercel/node';

let cachedApp: any = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedApp) {
    cachedApp = await NestFactory.create(AppModule, { bodyParser: false });

    cachedApp.enableCors({ origin: process.env.CORS_ORIGINS?.split(',') || ['*'], credentials: true });

    await cachedApp.init();
  }

  const httpAdapter = cachedApp.getHttpAdapter();
  const instance = httpAdapter.getInstance();

  instance(req, res);
}
