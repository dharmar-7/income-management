import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { RecurringService } from './recurring.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateRecurringDto } from './dto/create-recurring.dto';

@Controller('recurring')
@UseGuards(ClerkAuthGuard)
export class RecurringController {
  constructor(private service: RecurringService) {}

  @Get()
  findAll(@CurrentUser() clerkId: string) {
    return this.service.findAll(clerkId);
  }

  @Post()
  create(@CurrentUser() clerkId: string, @Body() dto: CreateRecurringDto) {
    return this.service.create(clerkId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() clerkId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateRecurringDto>,
  ) {
    return this.service.update(clerkId, id, dto);
  }

  @Post(':id/pay')
  markPaid(@CurrentUser() clerkId: string, @Param('id') id: string) {
    return this.service.markPaid(clerkId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() clerkId: string, @Param('id') id: string) {
    return this.service.remove(clerkId, id);
  }
}
