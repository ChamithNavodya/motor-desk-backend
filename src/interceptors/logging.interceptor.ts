import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Inject } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Logger as PinoLogger } from 'nestjs-pino';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(@Inject(PinoLogger) private logger: PinoLogger) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const now = Date.now();

    this.logger.log(`→ ${method} ${url}`, 'HTTP');

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const delay = Date.now() - now;
          this.logger.log(`← ${method} ${url} - ${response.statusCode} - ${delay}ms`, 'HTTP');
        },
        error: (error: any) => {
          this.logger.error(
            `✗ ${method} ${url} - ${error.statusCode || 500} - ${Date.now() - now}ms - ${error.message}`,
            'HTTP',
          );
        },
      }),
    );
  }
}
