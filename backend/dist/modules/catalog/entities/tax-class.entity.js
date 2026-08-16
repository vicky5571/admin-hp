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
exports.TaxClass = void 0;
const typeorm_1 = require("typeorm");
let TaxClass = class TaxClass {
};
exports.TaxClass = TaxClass;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], TaxClass.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], TaxClass.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'rate_percent', type: 'numeric', precision: 5, scale: 2 }),
    __metadata("design:type", String)
], TaxClass.prototype, "ratePercent", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_inclusive', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], TaxClass.prototype, "isInclusive", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], TaxClass.prototype, "createdAt", void 0);
exports.TaxClass = TaxClass = __decorate([
    (0, typeorm_1.Entity)('tax_classes')
], TaxClass);
//# sourceMappingURL=tax-class.entity.js.map