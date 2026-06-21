import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MagicLinkService } from './magic-link.service';

/**
 * MagicLinkModule provides token generation, validation, and consumption.
 * Imports ConfigModule to access the globally-registered ConfigService.
 */
@Module({
  imports: [ConfigModule],
  providers: [MagicLinkService],
  exports: [MagicLinkService],
})
export class MagicLinkModule {}
