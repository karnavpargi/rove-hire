import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FileService } from './file.service';

/**
 * FileModule provides S3 file upload/download operations.
 * Imports ConfigModule to access the globally-registered ConfigService.
 */
@Module({
  imports: [ConfigModule],
  providers: [FileService],
  exports: [FileService],
})
export class FileModule {}
