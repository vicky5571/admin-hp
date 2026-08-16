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
exports.SaleItemImei = void 0;
const typeorm_1 = require("typeorm");
const imei_unit_entity_1 = require("../../imei/entities/imei-unit.entity");
const sale_item_entity_1 = require("./sale-item.entity");
let SaleItemImei = class SaleItemImei {
};
exports.SaleItemImei = SaleItemImei;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], SaleItemImei.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_item_id', type: 'bigint' }),
    __metadata("design:type", Number)
], SaleItemImei.prototype, "saleItemId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imei_unit_id', type: 'bigint' }),
    __metadata("design:type", Number)
], SaleItemImei.prototype, "imeiUnitId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sale_item_entity_1.SaleItem, (item) => item.imeis, { onDelete: 'CASCADE' }),
    (0, typeorm_1.JoinColumn)({ name: 'sale_item_id' }),
    __metadata("design:type", sale_item_entity_1.SaleItem)
], SaleItemImei.prototype, "saleItem", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => imei_unit_entity_1.ImeiUnit),
    (0, typeorm_1.JoinColumn)({ name: 'imei_unit_id' }),
    __metadata("design:type", imei_unit_entity_1.ImeiUnit)
], SaleItemImei.prototype, "imeiUnit", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SaleItemImei.prototype, "createdAt", void 0);
exports.SaleItemImei = SaleItemImei = __decorate([
    (0, typeorm_1.Entity)('sale_item_imeis')
], SaleItemImei);
//# sourceMappingURL=sale-item-imei.entity.js.map