import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
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

  @Get('sales-summary/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async salesSummaryCsv(@Query() query: SalesSummaryQueryDto, @Res() res: Response) {
    const csv = await this.service.salesSummaryCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sales-summary.csv"' });
    res.send(csv);
  }

  @Get('sales-by-product/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async salesByProductCsv(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.service.salesByProductCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sales-by-product.csv"' });
    res.send(csv);
  }

  @Get('sales-by-cashier/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async salesByCashierCsv(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.service.salesByCashierCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="sales-by-cashier.csv"' });
    res.send(csv);
  }

  @Get('payment-breakdown/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async paymentBreakdownCsv(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.service.paymentBreakdownCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="payment-breakdown.csv"' });
    res.send(csv);
  }

  @Get('gross-profit/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async grossProfitCsv(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.service.grossProfitCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="gross-profit.csv"' });
    res.send(csv);
  }

  @Get('stock-on-hand/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.INVENTORY)
  async stockOnHandCsv(@Query() query: StockOnHandQueryDto, @Res() res: Response) {
    const csv = await this.service.stockOnHandCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="stock-on-hand.csv"' });
    res.send(csv);
  }

  @Get('returns-summary/csv')
  @Roles(RoleName.OWNER, RoleName.ADMIN)
  async returnsSummaryCsv(@Query() query: DateRangeQueryDto, @Res() res: Response) {
    const csv = await this.service.returnsSummaryCsv(query);
    res.set({ 'Content-Type': 'text/csv', 'Content-Disposition': 'attachment; filename="returns-summary.csv"' });
    res.send(csv);
  }
}
