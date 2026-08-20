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
exports.GoodsReceiptItem = void 0;
const typeorm_1 = require("typeorm");
const product_entity_1 = require("../../catalog/entities/product.entity");
const purchase_order_item_entity_1 = require("./purchase-order-item.entity");
const goods_receipt_entity_1 = require("./goods-receipt.entity");
const goods_receipt_item_imei_entity_1 = require("./goods-receipt-item-imei.entity");
let GoodsReceiptItem = class GoodsReceiptItem {
};
exports.GoodsReceiptItem = GoodsReceiptItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'goods_receipt_id', type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "goodsReceiptId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'po_item_id', type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "poItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', type: 'bigint' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'received_qty', type: 'int' }),
    __metadata("design:type", Number)
], GoodsReceiptItem.prototype, "receivedQty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], GoodsReceiptItem.prototype, "unitCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'actual_unit_cost', type: 'numeric', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], GoodsReceiptItem.prototype, "actualUnitCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'condition_status', type: 'varchar', length: 30, default: 'GOOD' }),
    __metadata("design:type", String)
], GoodsReceiptItem.prototype, "conditionStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'condition_notes', type: 'text', nullable: true }),
    __metadata("design:type", Object)
], GoodsReceiptItem.prototype, "conditionNotes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => goods_receipt_entity_1.GoodsReceipt, (gr) => gr.items),
    (0, typeorm_1.JoinColumn)({ name: 'goods_receipt_id' }),
    __metadata("design:type", goods_receipt_entity_1.GoodsReceipt)
], GoodsReceiptItem.prototype, "goodsReceipt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => purchase_order_item_entity_1.PurchaseOrderItem),
    (0, typeorm_1.JoinColumn)({ name: 'po_item_id' }),
    __metadata("design:type", purchase_order_item_entity_1.PurchaseOrderItem)
], GoodsReceiptItem.prototype, "poItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], GoodsReceiptItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => goods_receipt_item_imei_entity_1.GoodsReceiptItemImei, (link) => link.goodsReceiptItem, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], GoodsReceiptItem.prototype, "imeis", void 0);
exports.GoodsReceiptItem = GoodsReceiptItem = __decorate([
    (0, typeorm_1.Entity)('goods_receipt_items')
], GoodsReceiptItem);
//# sourceMappingURL=goods-receipt-item.entity.js.map