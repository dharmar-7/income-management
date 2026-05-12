import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { CreateSavingDto } from './dto/create-saving.dto';
import { UpdateSavingDto } from './dto/update-saving.dto';

@Controller('savings')
@UseGuards(ClerkAuthGuard)
export class SavingsController {
  constructor(private service: SavingsService) {}

  // ─── Portfolio summary ────────────────────────────────────────────────────
  @Get('summary')
  getSummary(@CurrentUser() userId: string) {
    return this.service.getSummary(userId);
  }

  // ─── Platforms ────────────────────────────────────────────────────────────
  @Get('platforms')
  getPlatforms(@CurrentUser() userId: string) {
    return this.service.getPlatforms(userId);
  }

  @Post('platforms')
  createPlatform(@CurrentUser() userId: string, @Body() dto: CreatePlatformDto) {
    return this.service.createPlatform(userId, dto);
  }

  @Patch('platforms/:id')
  updatePlatform(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdatePlatformDto) {
    return this.service.updatePlatform(userId, id, dto);
  }

  @Delete('platforms/:id')
  removePlatform(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.removePlatform(userId, id);
  }

  // ─── Individual savings ───────────────────────────────────────────────────
  @Get()
  getSavings(@CurrentUser() userId: string) {
    return this.service.getSavings(userId);
  }

  @Post()
  createSaving(@CurrentUser() userId: string, @Body() dto: CreateSavingDto) {
    return this.service.createSaving(userId, dto);
  }

  @Patch(':id')
  updateSaving(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateSavingDto) {
    return this.service.updateSaving(userId, id, dto);
  }

  @Delete(':id')
  removeSaving(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.removeSaving(userId, id);
  }
}
