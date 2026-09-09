import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { SalesService } from './sales.service';

@Controller('warranty')
@UseGuards(ThrottlerGuard)
export class WarrantyController {
  constructor(private readonly salesService: SalesService) {}

  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Get('lookup')
  lookup(@Query('query') query: string) {
    return this.salesService.lookupWarranty(query);
  }
}

