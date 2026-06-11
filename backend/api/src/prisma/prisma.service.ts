import { Injectable, OnModuleInit, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // clerkId → internal User.id. This mapping never changes for a given user,
  // so we cache it in memory and skip a DB round-trip on every authenticated
  // request (previously every endpoint did its own user.findUnique first).
  private readonly userIdCache = new Map<string, string>();

  async onModuleInit() {
    await this.$connect();
  }

  // Resolve our internal User.id from a Clerk user id, cached after first lookup.
  async resolveUserId(clerkId: string): Promise<string> {
    const cached = this.userIdCache.get(clerkId);
    if (cached) return cached;

    const user = await this.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found. Please log in again.');

    this.userIdCache.set(clerkId, user.id);
    return user.id;
  }
}
