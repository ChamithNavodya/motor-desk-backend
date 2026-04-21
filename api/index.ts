import { VercelRequest, VercelResponse } from '@vercel/node';
import { loadApplication } from '../src/main.js';

let cachedServer: any;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!cachedServer) {
    const { app } = await loadApplication();
    cachedServer = app.getHttpAdapter().getInstance();
  }

  return cachedServer(req, res);
}
