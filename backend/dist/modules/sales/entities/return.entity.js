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
exports.Return = void 0;
const typeorm_1 = require("typeorm");
const refund_method_enum_1 = require("../../../common/enums/refund-method.enum");
const return_status_enum_1 = require("../../../common/enums/return-status.enum");
const user_entity_1 = require("../../users/entities/user.entity");
const sale_entity_1 = require("./sale.entity");
const return_item_entity_1 = require("./return-item.entity");
let Return = class Return {
};
exports.Return = Return;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], Return.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'return_number', type: 'varchar', length: 40, unique: true }),
    __metadata("design:type", String)
], Return.prototype, "returnNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_id', type: 'bigint' }),
    __metadata("design:type", Number)
], Return.prototype, "saleId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'processed_by', type: 'bigint' }),
    __metadata("design:type", Number)
], Return.prototype, "processedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'return_time', type: 'timestamp' }),
    __metadata("design:type", Date)
], Return.prototype, "returnTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_total', type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], Return.prototype, "refundTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_method', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Return.prototype, "refundMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Return.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], Return.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Return.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => sale_entity_1.Sale),
    (0, typeorm_1.JoinColumn)({ name: 'sale_id' }),
    __metadata("design:type", sale_entity_1.Sale)
], Return.prototype, "sale", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'processed_by' }),
    __metadata("design:type", user_entity_1.User)
], Return.prototype, "processor", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => return_item_entity_1.ReturnItem, (item) => item.ret, {
        cascade: true,
        eager: true,
    }),
    __metadata("design:type", Array)
], Return.prototype, "items", void 0);
exports.Return = Return = __decorate([
    (0, typeorm_1.Entity)('returns')
], Return);
//# sourceMappingURL=return.entity.js.map