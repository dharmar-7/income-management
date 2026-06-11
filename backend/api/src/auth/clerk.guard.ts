import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { verifyToken } from '@clerk/backend';
import { Request } from 'express';

@Injectable()
export class ClerkAuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // Extract the Bearer token from the Authorization header
    const authHeader = request.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing or invalid authorization header');
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the JWT token with Clerk. If CLERK_JWT_KEY (the instance's PEM
      // public key) is set, verification is fully networkless — no JWKS fetch on
      // cold starts, which otherwise adds latency to the first request.
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
        ...(process.env.CLERK_JWT_KEY && { jwtKey: process.env.CLERK_JWT_KEY }),
      });

      // Attach the user's Clerk ID to the request so controllers can use it
      (request as any).clerkUserId = payload.sub;

      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
