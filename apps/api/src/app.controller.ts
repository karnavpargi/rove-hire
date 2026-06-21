import { Controller, Get, Header } from '@nestjs/common';
import type { AppService } from './app.service';
import { Public } from './common/decorators';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  /** Public health probe — no authentication required. */
  @Public()
  @Get('api/health')
  @Header('Cache-Control', 'no-store')
  getHealth(): { status: string } {
    return { status: 'ok' };
  }
}
