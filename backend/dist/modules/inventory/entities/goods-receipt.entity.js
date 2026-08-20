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
exports.GoodsReceipt = void 0;
const typeorm_1 = require("typeorm");
const user_entity_1 = require("../../users/entities/user.entity");
const purchase_order_entity_1 = require("./purchase-order.entity");
const goods_receipt_item_entity_1 = require("./goods-receipt-item.entity");
let GoodsReceipt = class GoodsReceipt {
};
exports.GoodsReceipt = GoodsReceipt;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceipt.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'grn_number', type: 'varchar', length: 40, unique: true }),
    __metadata("design:type", String)
], GoodsReceipt.prototype, "grnNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'purchase_order_id', type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceipt.prototype, "purchaseOrderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'receive_date', type: 'timestamp' }),
    __metadata("design:type", Date)
], GoodsReceipt.prototype, "receiveDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_by', type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceipt.prototype, "receivedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], GoodsReceipt.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'supplier_do_number', type: 'varchar', length: 60, nullable: true }),
    __metadata("design:type", Object)
], GoodsReceipt.prototype, "supplierDoNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'carrier_name', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], GoodsReceipt.prototype, "carrierName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tracking_number', type: 'varchar', length: 120, nullable: true }),
    __metadata("design:type", Object)
], GoodsReceipt.prototype, "trackingNumber", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], GoodsReceipt.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_entity_1.PurchaseOrder),
    (0, typeorm_1.JoinColumn)({ name: 'purchase_order_id' }),
    __metadata("design:type", purchase_order_entity_1.PurchaseOrder)
], GoodsReceipt.prototype, "purchaseOrder", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'received_by' }),
    __metadata("design:type", user_entity_1.User)
], GoodsReceipt.prototype, "receiver", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => goods_receipt_item_entity_1.GoodsReceiptItem, (item) => item.goodsReceipt, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], GoodsReceipt.prototype, "items", void 0);
exports.GoodsReceipt = GoodsReceipt = __decorate([
    (0, typeorm_1.Entity)('goods_receipts')
], GoodsReceipt);
//# sourceMappingURL=goods-receipt.entity.js.map