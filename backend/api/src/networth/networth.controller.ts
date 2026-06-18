import { Controller, Get, UseGuards } from '@nestjs/common';
import { NetworthService } from './networth.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('networth')
@UseGuards(ClerkAuthGuard)
export class NetworthController {
  constructor(private service: NetworthService) {}

  // GET /networth — current net worth + breakdown + monthly trend.
  // Recording this month's snapshot is a side effect of reading (idempotent).
  @Get()
  getNetWorth(@CurrentUser() userId: string) {
    return this.service.getNetWorth(userId);
  }
}
