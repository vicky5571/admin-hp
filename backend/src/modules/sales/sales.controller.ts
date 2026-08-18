import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/enums/role.enum';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto, QuoteSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales.query.dto';
import { PricingService } from './pricing.service';
import { ReceiptService } from './receipt.service';
import { SalesService } from './sales.service';

@Controller('sales')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesController {
  constructor(
    private readonly salesService: SalesService,
    private readonly pricingService: PricingService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Post('quote')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  quote(@Body() dto: QuoteSaleDto) {
    return this.pricingService.quote(dto as CreateSaleDto);
  }

  @Post()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  create(@Body() dto: CreateSaleDto, @CurrentUser() user: AuthUser) {
    return this.salesService.create(dto, user);
  }

  @Get()
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  findAll(@Query() query: ListSalesQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.salesService.findOne(id);
  }

  @Get(':id/receipt')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  async receipt(@Param('id', ParseIntPipe) id: number) {
    const sale = await this.salesService.findOne(id);
    return this.receiptService.buildReceiptPayload(sale);
  }

  @Get(':id/receipt/pdf')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.CASHIER)
  async receiptPdf(
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const sale = await this.salesService.findOne(id);
    const pdfBuffer = await this.receiptService.generatePdf(sale);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${sale.invoiceNumber}.pdf"`,
      'Content-Length': pdfBuffer.length,
    });
    res.end(pdfBuffer);
  }

  @Post(':id/void')
  @Roles(RoleName.OWNER, RoleName.ADMIN, RoleName.SUPERVISOR)
  voidSale(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.salesService.voidSale(id, user);
  }
}
