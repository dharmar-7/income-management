import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { GmailSyncService } from './gmail-sync.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GmailCronService {
  private readonly logger = new Logger(GmailCronService.name);

  constructor(
    private syncService: GmailSyncService,
    private prisma: PrismaService,
  ) {}

  // Runs every hour — syncs Gmail for all connected users
  @Cron(CronExpression.EVERY_HOUR)
  async syncAllUsers() {
    this.logger.log('Starting hourly Gmail sync...');

    // Find all users who have Gmail connected (have a refresh token)
    const users = await this.prisma.user.findMany({
      where: { gmailRefreshToken: { not: null } },
      select: { clerkId: true, email: true },
    });

    this.logger.log(`Found ${users.length} user(s) with Gmail connected`);

    let totalImported = 0;

    for (const user of users) {
      try {
        const count = await this.syncService.syncUser(user.clerkId);
        totalImported += count;
        if (count > 0) {
          this.logger.log(`Synced ${user.email}: ${count} new transactions`);
        }
      } catch (err) {
        // Don't let one user's failure stop others
        this.logger.error(`Sync failed for ${user.email}: ${err}`);
      }
    }

    this.logger.log(`Hourly sync complete. Total imported: ${totalImported}`);
  }
}
