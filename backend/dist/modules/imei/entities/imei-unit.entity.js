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
exports.ImeiUnit = void 0;
const typeorm_1 = require("typeorm");
const imei_status_enum_1 = require("../../../common/enums/imei-status.enum");
const product_entity_1 = require("../../catalog/entities/product.entity");
let ImeiUnit = class ImeiUnit {
};
exports.ImeiUnit = ImeiUnit;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], ImeiUnit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 30, unique: true }),
    __metadata("design:type", String)
], ImeiUnit.prototype, "imei", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', type: 'bigint' }),
    __metadata("design:type", Number)
], ImeiUnit.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], ImeiUnit.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'current_location', type: 'varchar', length: 30, default: 'STORE' }),
    __metadata("design:type", String)
], ImeiUnit.prototype, "currentLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_ref_type', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], ImeiUnit.prototype, "lastRefType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_ref_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], ImeiUnit.prototype, "lastRefId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], ImeiUnit.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], ImeiUnit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], ImeiUnit.prototype, "updatedAt", void 0);
exports.ImeiUnit = ImeiUnit = __decorate([
    (0, typeorm_1.Entity)('imei_units')
], ImeiUnit);
//# sourceMappingURL=imei-unit.entity.js.map