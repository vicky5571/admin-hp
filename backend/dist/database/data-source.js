"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const typeorm_1 = require("typeorm");
const dotenv_1 = require("dotenv");
const role_entity_1 = require("../modules/roles/entities/role.entity");
const user_entity_1 = require("../modules/users/entities/user.entity");
const product_entity_1 = require("../modules/catalog/entities/product.entity");
const tax_class_entity_1 = require("../modules/catalog/entities/tax-class.entity");
const category_entity_1 = require("../modules/catalog/entities/category.entity");
const brand_entity_1 = require("../modules/catalog/entities/brand.entity");
const app_setting_entity_1 = require("../modules/settings/entities/app-setting.entity");
const supplier_entity_1 = require("../modules/inventory/entities/supplier.entity");
const purchase_order_entity_1 = require("../modules/inventory/entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../modules/inventory/entities/purchase-order-item.entity");
const goods_receipt_entity_1 = require("../modules/inventory/entities/goods-receipt.entity");
const goods_receipt_item_entity_1 = require("../modules/inventory/entities/goods-receipt-item.entity");
const goods_receipt_item_imei_entity_1 = require("../modules/inventory/entities/goods-receipt-item-imei.entity");
const imei_unit_entity_1 = require("../modules/imei/entities/imei-unit.entity");
const stock_balance_entity_1 = require("../modules/inventory/entities/stock-balance.entity");
const stock_movement_entity_1 = require("../modules/inventory/entities/stock-movement.entity");
const sale_entity_1 = require("../modules/sales/entities/sale.entity");
const sale_item_entity_1 = require("../modules/sales/entities/sale-item.entity");
const sale_item_imei_entity_1 = require("../modules/sales/entities/sale-item-imei.entity");
const payment_entity_1 = require("../modules/sales/entities/payment.entity");
const customer_entity_1 = require("../modules/sales/entities/customer.entity");
const return_entity_1 = require("../modules/sales/entities/return.entity");
const return_item_entity_1 = require("../modules/sales/entities/return-item.entity");
const return_item_imei_entity_1 = require("../modules/sales/entities/return-item-imei.entity");
const audit_log_entity_1 = require("../modules/audit-logs/entities/audit-log.entity");
(0, dotenv_1.config)();
const AppDataSource = new typeorm_1.DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? '127.0.0.1',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? 'postgres',
    password: process.env.DB_PASS ?? 'postgres',
    database: process.env.DB_NAME ?? 'smartstore',
    entities: [
        role_entity_1.Role,
        user_entity_1.User,
        product_entity_1.Product,
        tax_class_entity_1.TaxClass,
        category_entity_1.Category,
        brand_entity_1.Brand,
        app_setting_entity_1.AppSetting,
        supplier_entity_1.Supplier,
        purchase_order_entity_1.PurchaseOrder,
        purchase_order_item_entity_1.PurchaseOrderItem,
        goods_receipt_entity_1.GoodsReceipt,
        goods_receipt_item_entity_1.GoodsReceiptItem,
        goods_receipt_item_imei_entity_1.GoodsReceiptItemImei,
        imei_unit_entity_1.ImeiUnit,
        stock_balance_entity_1.StockBalance,
        stock_movement_entity_1.StockMovement,
        sale_entity_1.Sale,
        sale_item_entity_1.SaleItem,
        sale_item_imei_entity_1.SaleItemImei,
        payment_entity_1.Payment,
        customer_entity_1.Customer,
        return_entity_1.Return,
        return_item_entity_1.ReturnItem,
        return_item_imei_entity_1.ReturnItemImei,
        audit_log_entity_1.AuditLog,
    ],
    migrations: ['src/database/migrations/*.ts'],
});
exports.default = AppDataSource;
//# sourceMappingURL=data-source.js.map