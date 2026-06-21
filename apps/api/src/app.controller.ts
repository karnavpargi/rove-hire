import { Controller, Get, Header, Inject } from '@nestjs/common';
import { AppService } from './app.service';
import { Public } from './common/decorators';

@Controller()
export class AppController {
  constructor(@Inject(AppService) private readonly appService: AppService) {}

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
