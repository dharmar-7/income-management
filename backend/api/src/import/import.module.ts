import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { TakeoutParserService } from './takeout-parser.service';
import { CategorizerService } from './categorizer.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [ImportController],
  providers: [ImportService, TakeoutParserService, CategorizerService],
  exports: [CategorizerService],
})
export class ImportModule {}
