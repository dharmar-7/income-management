import { Module } from '@nestjs/common';
import { NetworthController } from './networth.controller';
import { NetworthService } from './networth.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [NetworthController],
  providers: [NetworthService],
})
export class NetworthModule {}
