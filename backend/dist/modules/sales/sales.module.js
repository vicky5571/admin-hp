"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesModule = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const product_entity_1 = require("../catalog/entities/product.entity");
const imei_unit_entity_1 = require("../imei/entities/imei-unit.entity");
const stock_balance_entity_1 = require("../inventory/entities/stock-balance.entity");
const stock_movement_entity_1 = require("../inventory/entities/stock-movement.entity");
const customer_entity_1 = require("./entities/customer.entity");
const payment_entity_1 = require("./entities/payment.entity");
const return_item_imei_entity_1 = require("./entities/return-item-imei.entity");
const return_item_entity_1 = require("./entities/return-item.entity");
const return_entity_1 = require("./entities/return.entity");
const sale_item_imei_entity_1 = require("./entities/sale-item-imei.entity");
const sale_item_entity_1 = require("./entities/sale-item.entity");
const sale_entity_1 = require("./entities/sale.entity");
const pricing_service_1 = require("./pricing.service");
const receipt_service_1 = require("./receipt.service");
const returns_controller_1 = require("./returns.controller");
const returns_service_1 = require("./returns.service");
const sales_controller_1 = require("./sales.controller");
const sales_service_1 = require("./sales.service");
let SalesModule = class SalesModule {
};
exports.SalesModule = SalesModule;
exports.SalesModule = SalesModule = __decorate([
    (0, common_1.Module)({
        imports: [
            typeorm_1.TypeOrmModule.forFeature([
                sale_entity_1.Sale,
                sale_item_entity_1.SaleItem,
                sale_item_imei_entity_1.SaleItemImei,
                payment_entity_1.Payment,
                customer_entity_1.Customer,
                return_entity_1.Return,
                return_item_entity_1.ReturnItem,
                return_item_imei_entity_1.ReturnItemImei,
                product_entity_1.Product,
                imei_unit_entity_1.ImeiUnit,
                stock_balance_entity_1.StockBalance,
                stock_movement_entity_1.StockMovement,
            ]),
        ],
        controllers: [sales_controller_1.SalesController, returns_controller_1.ReturnsController],
        providers: [sales_service_1.SalesService, pricing_service_1.PricingService, receipt_service_1.ReceiptService, returns_service_1.ReturnsService],
        exports: [sales_service_1.SalesService, returns_service_1.ReturnsService],
    })
], SalesModule);
//# sourceMappingURL=sales.module.js.map