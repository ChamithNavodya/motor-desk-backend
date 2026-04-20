import { ConfigService } from '@nestjs/config';
import { Params } from 'nestjs-pino';

export const getLoggerConfig = (configService: ConfigService): Params => {
  const isProduction = configService.get('NODE_ENV') === 'production';
  const ignoredContexts = configService
    .get<string>('LOG_IGNORED_CONTEXTS', '')
    .split(',')
    .map((c) => c.trim())
    .filter((c) => c.length > 0);

  return {
    pinoHttp: {
      transport: isProduction
        ? undefined
        : {
            target: 'pino-pretty',
            options: {
              colorize: true,
              levelFirst: true,
              ignore: 'hostname,context,reqId,responseTime',
              messageFormat: '\x1b[36m[{context}]\x1b[0m {msg}',
            },
          },
      level: isProduction ? 'info' : 'debug',
      // Hooks for filtering out contexts
      hooks: {
        logMethod(inputArgs: unknown[], method: (...args: unknown[]) => void) {
          for (let i = 0; i < Math.min(inputArgs.length, 2); i++) {
            const arg = inputArgs[i];
            if (typeof arg === 'object' && arg !== null) {
              const extra = arg as Record<string, unknown>;
              if (typeof extra.context === 'string' && ignoredContexts.includes(extra.context)) {
                return;
              }
            }
          }
          method.apply(this, inputArgs);
        },
      },
      quietReqLogger: true,
      autoLogging: false,
      serializers: {
        req: () => undefined,
        res: () => undefined,
      },
    },
  };
};
