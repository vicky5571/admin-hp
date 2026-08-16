"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockBalance = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("../../catalog/entities/product.entity");
let StockBalance = class StockBalance {
};
exports.StockBalance = StockBalance;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ name: 'product_id', type: 'bigint' }),
    __metadata("design:type", Number)
], StockBalance.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'on_hand_qty', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], StockBalance.prototype, "onHandQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reserved_qty', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], StockBalance.prototype, "reservedQty", void 0);
__decorate([
    (0, typeorm_1.OneToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], StockBalance.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], StockBalance.prototype, "updatedAt", void 0);
exports.StockBalance = StockBalance = __decorate([
    (0, typeorm_1.Entity)('stock_balances')
], StockBalance);
//# sourceMappingURL=stock-balance.entity.js.map