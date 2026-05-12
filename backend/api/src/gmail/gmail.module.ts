import { Module } from '@nestjs/common';
import { GmailController } from './gmail.controller';
import { GmailOAuthService } from './gmail-oauth.service';
import { GmailSyncService } from './gmail-sync.service';
import { GmailCronService } from './gmail-cron.service';
import { AuthModule } from '../auth/auth.module';
import { ImportModule } from '../import/import.module';

@Module({
  imports: [AuthModule, ImportModule],
  controllers: [GmailController],
  providers: [GmailOAuthService, GmailSyncService, GmailCronService],
})
export class GmailModule {}
