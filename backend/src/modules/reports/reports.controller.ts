import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  DateRangeQueryDto,
  SalesSummaryQueryDto,
  StockMovementsQueryDto,
  StockOnHandQueryDto,
} from './dto/reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('sales-summary')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  salesSummary(@Query() query: SalesSummaryQueryDto) {
    return this.service.salesSummary(query);
  }

  @Get('sales-by-product')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  salesByProduct(@Query() query: DateRangeQueryDto) {
    return this.service.salesByProduct(query);
  }

  @Get('sales-by-cashier')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  salesByCashier(@Query() query: DateRangeQueryDto) {
    return this.service.salesByCashier(query);
  }

  @Get('payment-breakdown')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  paymentBreakdown(@Query() query: DateRangeQueryDto) {
    return this.service.paymentBreakdown(query);
  }

  @Get('gross-profit')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  grossProfit(@Query() query: DateRangeQueryDto) {
    return this.service.grossProfit(query);
  }

  @Get('stock-on-hand')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  stockOnHand(@Query() query: StockOnHandQueryDto) {
    return this.service.stockOnHand(query);
  }

  @Get('stock-movements')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  stockMovements(@Query() query: StockMovementsQueryDto) {
    return this.service.stockMovements(query);
  }

  @Get('returns-summary')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  returnsSummary(@Query() query: DateRangeQueryDto) {
    return this.service.returnsSummary(query);
  }
}
