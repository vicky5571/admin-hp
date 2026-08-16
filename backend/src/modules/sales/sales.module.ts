import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { Customer } from './entities/customer.entity';
import { Payment } from './entities/payment.entity';
import { ReturnItemImei } from './entities/return-item-imei.entity';
import { ReturnItem } from './entities/return-item.entity';
import { Return } from './entities/return.entity';
import { SaleItemImei } from './entities/sale-item-imei.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { PricingService } from './pricing.service';
import { ReceiptService } from './receipt.service';
import { ReturnsController } from './returns.controller';
import { ReturnsService } from './returns.service';
import { SalesController } from './sales.controller';
import { SalesService } from './sales.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Sale,
      SaleItem,
      SaleItemImei,
      Payment,
      Customer,
      Return,
      ReturnItem,
      ReturnItemImei,
      Product,
      ImeiUnit,
      StockBalance,
      StockMovement,
    ]),
  ],
  controllers: [SalesController, ReturnsController],
  providers: [SalesService, PricingService, ReceiptService, ReturnsService],
  exports: [SalesService, ReturnsService],
})
export class SalesModule {}
