import { Controller, Get, UseGuards } from '@nestjs/common';
import { StreaksService } from './streaks.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('streaks')
@UseGuards(ClerkAuthGuard)
export class StreaksController {
  constructor(private service: StreaksService) {}

  // GET /streaks — activity streak + achievement progress.
  @Get()
  getSummary(@CurrentUser() userId: string) {
    return this.service.getSummary(userId);
  }
}
