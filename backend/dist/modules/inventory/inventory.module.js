"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const product_entity_1 = require("../catalog/entities/product.entity");
const imei_unit_entity_1 = require("../imei/entities/imei-unit.entity");
const supplier_entity_1 = require("./entities/supplier.entity");
const purchase_order_entity_1 = require("./entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("./entities/purchase-order-item.entity");
const goods_receipt_entity_1 = require("./entities/goods-receipt.entity");
const goods_receipt_item_entity_1 = require("./entities/goods-receipt-item.entity");
const goods_receipt_item_imei_entity_1 = require("./entities/goods-receipt-item-imei.entity");
const stock_balance_entity_1 = require("./entities/stock-balance.entity");
const stock_movement_entity_1 = require("./entities/stock-movement.entity");
const suppliers_controller_1 = require("./suppliers/suppliers.controller");
const suppliers_service_1 = require("./suppliers/suppliers.service");
const purchase_orders_controller_1 = require("./purchase-orders/purchase-orders.controller");
const purchase_orders_service_1 = require("./purchase-orders/purchase-orders.service");
const goods_receipts_controller_1 = require("./goods-receipts/goods-receipts.controller");
const goods_receipts_service_1 = require("./goods-receipts/goods-receipts.service");
const adjustments_controller_1 = require("./adjustments/adjustments.controller");
const adjustments_service_1 = require("./adjustments/adjustments.service");
const audit_logs_module_1 = require("../audit-logs/audit-logs.module");
let InventoryModule = class InventoryModule {
};
exports.InventoryModule = InventoryModule;
exports.InventoryModule = InventoryModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                product_entity_1.Product,
                imei_unit_entity_1.ImeiUnit,
                supplier_entity_1.Supplier,
                purchase_order_entity_1.PurchaseOrder,
                purchase_order_item_entity_1.PurchaseOrderItem,
                goods_receipt_entity_1.GoodsReceipt,
                goods_receipt_item_entity_1.GoodsReceiptItem,
                goods_receipt_item_imei_entity_1.GoodsReceiptItemImei,
                stock_balance_entity_1.StockBalance,
                stock_movement_entity_1.StockMovement,
            ]),
            audit_logs_module_1.AuditLogsModule,
        ],
        controllers: [
            suppliers_controller_1.SuppliersController,
            purchase_orders_controller_1.PurchaseOrdersController,
            goods_receipts_controller_1.GoodsReceiptsController,
            adjustments_controller_1.AdjustmentsController,
        ],
        providers: [
            suppliers_service_1.SuppliersService,
            purchase_orders_service_1.PurchaseOrdersService,
            goods_receipts_service_1.GoodsReceiptsService,
            adjustments_service_1.AdjustmentsService,
        ],
        exports: [
            suppliers_service_1.SuppliersService,
            purchase_orders_service_1.PurchaseOrdersService,
            goods_receipts_service_1.GoodsReceiptsService,
            adjustments_service_1.AdjustmentsService,
            typeorm_1.TypeOrmModule,
        ],
    })
], InventoryModule);
//# sourceMappingURL=inventory.module.js.map