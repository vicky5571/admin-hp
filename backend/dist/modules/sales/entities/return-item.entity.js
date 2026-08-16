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
exports.ReturnItem = void 0;
const typeorm_1 = require("typeorm");
const restock_type_enum_1 = require("../../../common/enums/restock-type.enum");
const product_entity_1 = require("../../catalog/entities/product.entity");
const return_entity_1 = require("./return.entity");
const return_item_imei_entity_1 = require("./return-item-imei.entity");
const sale_item_entity_1 = require("./sale-item.entity");
let ReturnItem = class ReturnItem {
};
exports.ReturnItem = ReturnItem;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'return_id', type: 'bigint' }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "returnId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_item_id', type: 'bigint' }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "saleItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', type: 'bigint' }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], ReturnItem.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_refund', type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], ReturnItem.prototype, "unitRefund", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'line_refund_total',
        type: 'numeric',
        precision: 14,
        scale: 2,
    }),
    __metadata("design:type", String)
], ReturnItem.prototype, "lineRefundTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'restock_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ReturnItem.prototype, "restockType", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => return_entity_1.Return, (ret) => ret.items),
    (0, typeorm_1.JoinColumn)({ name: 'return_id' }),
    __metadata("design:type", return_entity_1.Return)
], ReturnItem.prototype, "ret", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sale_item_entity_1.SaleItem),
    (0, typeorm_1.JoinColumn)({ name: 'sale_item_id' }),
    __metadata("design:type", sale_item_entity_1.SaleItem)
], ReturnItem.prototype, "saleItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], ReturnItem.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => return_item_imei_entity_1.ReturnItemImei, (link) => link.returnItem, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], ReturnItem.prototype, "imeis", void 0);
exports.ReturnItem = ReturnItem = __decorate([
    (0, typeorm_1.Entity)('return_items')
], ReturnItem);
//# sourceMappingURL=return-item.entity.js.map