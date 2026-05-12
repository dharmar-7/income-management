import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Usage in a controller: @CurrentUser() userId: string
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return (request as any).clerkUserId;
  },
);
