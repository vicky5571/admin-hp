import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { Supplier } from './entities/supplier.entity';
import { PurchaseOrder } from './entities/purchase-order.entity';
import { PurchaseOrderItem } from './entities/purchase-order-item.entity';
import { GoodsReceipt } from './entities/goods-receipt.entity';
import { GoodsReceiptItem } from './entities/goods-receipt-item.entity';
import { GoodsReceiptItemImei } from './entities/goods-receipt-item-imei.entity';
import { StockBalance } from './entities/stock-balance.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { SuppliersController } from './suppliers/suppliers.controller';
import { SuppliersService } from './suppliers/suppliers.service';
import { PurchaseOrdersController } from './purchase-orders/purchase-orders.controller';
import { PurchaseOrdersService } from './purchase-orders/purchase-orders.service';
import { GoodsReceiptsController } from './goods-receipts/goods-receipts.controller';
import { GoodsReceiptsService } from './goods-receipts/goods-receipts.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ImeiUnit,
      Supplier,
      PurchaseOrder,
      PurchaseOrderItem,
      GoodsReceipt,
      GoodsReceiptItem,
      GoodsReceiptItemImei,
      StockBalance,
      StockMovement,
    ]),
  ],
  controllers: [SuppliersController, PurchaseOrdersController, GoodsReceiptsController],
  providers: [SuppliersService, PurchaseOrdersService, GoodsReceiptsService],
  exports: [SuppliersService, PurchaseOrdersService, GoodsReceiptsService, TypeOrmModule],
})
export class InventoryModule {}
