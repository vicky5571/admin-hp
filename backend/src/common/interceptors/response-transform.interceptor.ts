import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: true; data: unknown; meta: unknown }> {
    return next.handle().pipe(
      map((payload) => {
        if (
          payload &&
          typeof payload === 'object' &&
          'data' in payload &&
          'meta' in payload
        ) {
          const typed = payload as { data: unknown; meta: unknown };
          return {
            success: true as const,
            data: typed.data,
            meta: typed.meta,
          };
        }

        return {
          success: true as const,
          data: payload,
          meta: {},
        };
      }),
    );
  }
}
