import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { Role } from '../modules/roles/entities/role.entity';
import { User } from '../modules/users/entities/user.entity';
import { Product } from '../modules/catalog/entities/product.entity';
import { TaxClass } from '../modules/catalog/entities/tax-class.entity';
import { Category } from '../modules/catalog/entities/category.entity';
import { Brand } from '../modules/catalog/entities/brand.entity';
import { AppSetting } from '../modules/settings/entities/app-setting.entity';
import { Supplier } from '../modules/inventory/entities/supplier.entity';
import { PurchaseOrder } from '../modules/inventory/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../modules/inventory/entities/purchase-order-item.entity';
import { GoodsReceipt } from '../modules/inventory/entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../modules/inventory/entities/goods-receipt-item.entity';
import { GoodsReceiptItemImei } from '../modules/inventory/entities/goods-receipt-item-imei.entity';
import { ImeiUnit } from '../modules/imei/entities/imei-unit.entity';
import { StockBalance } from '../modules/inventory/entities/stock-balance.entity';
import { StockMovement } from '../modules/inventory/entities/stock-movement.entity';
import { Sale } from '../modules/sales/entities/sale.entity';
import { SaleItem } from '../modules/sales/entities/sale-item.entity';
import { SaleItemImei } from '../modules/sales/entities/sale-item-imei.entity';
import { Payment } from '../modules/sales/entities/payment.entity';
import { Customer } from '../modules/sales/entities/customer.entity';
import { Return } from '../modules/sales/entities/return.entity';
import { ReturnItem } from '../modules/sales/entities/return-item.entity';
import { ReturnItemImei } from '../modules/sales/entities/return-item-imei.entity';
import { AuditLog } from '../modules/audit-logs/entities/audit-log.entity';

config();

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASS ?? 'postgres',
  database: process.env.DB_NAME ?? 'smartstore',
  entities: [
    Role,
    User,
    Product,
    TaxClass,
    Category,
    Brand,
    AppSetting,
    Supplier,
    PurchaseOrder,
    PurchaseOrderItem,
    GoodsReceipt,
    GoodsReceiptItem,
    GoodsReceiptItemImei,
    ImeiUnit,
    StockBalance,
    StockMovement,
    Sale,
    SaleItem,
    SaleItemImei,
    Payment,
    Customer,
    Return,
    ReturnItem,
    ReturnItemImei,
    AuditLog,
  ],
  migrations: ['src/database/migrations/*.ts'],
});

export default AppDataSource;
