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
exports.StockMovement = void 0;
const typeorm_1 = require("typeorm");
const movement_type_enum_1 = require("../../../common/enums/movement-type.enum");
const product_entity_1 = require("../../catalog/entities/product.entity");
const imei_unit_entity_1 = require("../../imei/entities/imei-unit.entity");
const user_entity_1 = require("../../users/entities/user.entity");
let StockMovement = class StockMovement {
};
exports.StockMovement = StockMovement;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'movement_time' }),
    __metadata("design:type", Date)
], StockMovement.prototype, "movementTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_id', type: 'bigint' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "productId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'imei_unit_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], StockMovement.prototype, "imeiUnitId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'movement_type', type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], StockMovement.prototype, "movementType", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "qty", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2, nullable: true }),
    __metadata("design:type", Object)
], StockMovement.prototype, "unitCost", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_type', type: 'varchar', length: 30 }),
    __metadata("design:type", String)
], StockMovement.prototype, "refType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'ref_id', type: 'bigint' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "refId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'reason_code', type: 'varchar', length: 30, nullable: true }),
    __metadata("design:type", Object)
], StockMovement.prototype, "reasonCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'bigint' }),
    __metadata("design:type", Number)
], StockMovement.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], StockMovement.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => product_entity_1.Product),
    (0, typeorm_1.JoinColumn)({ name: 'product_id' }),
    __metadata("design:type", product_entity_1.Product)
], StockMovement.prototype, "product", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => imei_unit_entity_1.ImeiUnit),
    (0, typeorm_1.JoinColumn)({ name: 'imei_unit_id' }),
    __metadata("design:type", Object)
], StockMovement.prototype, "imeiUnit", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'created_by' }),
    __metadata("design:type", user_entity_1.User)
], StockMovement.prototype, "creator", void 0);
exports.StockMovement = StockMovement = __decorate([
    (0, typeorm_1.Entity)('stock_movements')
], StockMovement);
//# sourceMappingURL=stock-movement.entity.js.map