import { Module } from '@nestjs/common';
import { SmsController } from './sms.controller';
import { SmsSyncService } from './sms-sync.service';
import { SmsParserService } from './sms-parser.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { ImportModule } from '../import/import.module';

@Module({
  imports: [PrismaModule, AuthModule, ImportModule],
  controllers: [SmsController],
  providers: [SmsSyncService, SmsParserService],
})
export class SmsModule {}
