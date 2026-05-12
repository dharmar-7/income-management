import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request } from 'express';

// An interceptor wraps every request — it runs code BEFORE the handler
// (controller method) and AFTER via the tap() operator on the response stream.
//
// This one logs: who made the request, what route, how long it took,
// and whether it succeeded or failed. Useful for debugging and auditing.
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest<Request>();
    const { method, url } = req;

    // clerkUserId is attached by ClerkAuthGuard on authenticated routes
    const userId: string = (req as Request & { clerkUserId?: string }).clerkUserId ?? 'anonymous';

    const start = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const ms = Date.now() - start;
          this.logger.log(`${method} ${url} [${userId}] — ${ms}ms`);
        },
        error: (err: Error) => {
          const ms = Date.now() - start;
          this.logger.warn(`${method} ${url} [${userId}] — ${ms}ms — ERROR: ${err.message}`);
        },
      }),
    );
  }
}
