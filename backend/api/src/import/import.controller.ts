import {
  Controller,
  Post,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ImportService } from './import.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('import')
@UseGuards(ClerkAuthGuard)  // all import routes require login
export class ImportController {
  constructor(private importService: ImportService) {}

  // POST /import/takeout
  // Accepts a JSON file, parses it, and imports transactions
  @Post('takeout')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(), // keep file in memory, don't write to disk
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB max
      },
      fileFilter: (_req, file, callback) => {
        // Only allow JSON files
        if (
          file.mimetype === 'application/json' ||
          file.originalname.endsWith('.json')
        ) {
          callback(null, true);
        } else {
          callback(
            new BadRequestException('Only JSON files are allowed.'),
            false,
          );
        }
      },
    }),
  )
  async uploadTakeout(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded. Please attach a JSON file.');
    }

    const summary = await this.importService.importTakeout(file.buffer, userId);

    return {
      message: `Import complete. ${summary.imported} transactions imported.`,
      ...summary,
    };
  }
}
