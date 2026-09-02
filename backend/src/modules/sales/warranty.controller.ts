import { Controller, Get, Query } from '@nestjs/common';
import { SalesService } from './sales.service';

@Controller('warranty')
export class WarrantyController {
  constructor(private readonly salesService: SalesService) {}

  @Get('lookup')
  lookup(@Query('query') query: string) {
    return this.salesService.lookupWarranty(query);
  }
}
