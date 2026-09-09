import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Product } from "../catalog/entities/product.entity";
import { ImeiUnit } from "../imei/entities/imei-unit.entity";
import { StockBalance } from "../inventory/entities/stock-balance.entity";
import { StockMovement } from "../inventory/entities/stock-movement.entity";
import { CashierShift } from "./entities/cashier-shift.entity";
import { CashMovement } from "./entities/cash-movement.entity";
import { Customer } from "./entities/customer.entity";
import { Payment } from "./entities/payment.entity";
import { ReturnItemImei } from "./entities/return-item-imei.entity";
import { ReturnItem } from "./entities/return-item.entity";
import { Return } from "./entities/return.entity";
import { SaleItemImei } from "./entities/sale-item-imei.entity";
import { SaleItem } from "./entities/sale-item.entity";
import { Sale } from "./entities/sale.entity";
import { PricingService } from "./pricing.service";
import { ReceiptService } from "./receipt.service";
import { ReturnsController } from "./returns.controller";
import { ReturnsService } from "./returns.service";
import { SalesController } from "./sales.controller";
import { SalesService } from "./sales.service";
import { ShiftsController } from "./shifts.controller";
import { ShiftsService } from "./shifts.service";
import { WarrantyController } from "./warranty.controller";
import { AppSetting } from "../settings/entities/app-setting.entity";

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
      CashierShift,
      CashMovement,
      AppSetting,
    ]),
  ],
  controllers: [
    ShiftsController,
    ReturnsController,
    SalesController,
    WarrantyController,
  ],
  providers: [
    SalesService,
    PricingService,
    ReceiptService,
    ReturnsService,
    ShiftsService,
  ],
  exports: [SalesService, ReturnsService, ShiftsService],
})
export class SalesModule {}
