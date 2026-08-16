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
exports.Sale = void 0;
const typeorm_1 = require("typeorm");
const sale_status_enum_1 = require("../../../common/enums/sale-status.enum");
const user_entity_1 = require("../../users/entities/user.entity");
const customer_entity_1 = require("./customer.entity");
const payment_entity_1 = require("./payment.entity");
const sale_item_entity_1 = require("./sale-item.entity");
let Sale = class Sale {
};
exports.Sale = Sale;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: 'bigint' }),
    __metadata("design:type", Number)
], Sale.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_number', type: 'varchar', length: 40, unique: true }),
    __metadata("design:type", String)
], Sale.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sale_time', type: 'timestamp' }),
    __metadata("design:type", Date)
], Sale.prototype, "saleTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cashier_id', type: 'bigint' }),
    __metadata("design:type", Number)
], Sale.prototype, "cashierId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'bigint', nullable: true }),
    __metadata("design:type", Object)
], Sale.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], Sale.prototype, "subtotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_total', type: 'numeric', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", String)
], Sale.prototype, "discountTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tax_total', type: 'numeric', precision: 14, scale: 2, default: 0 }),
    __metadata("design:type", String)
], Sale.prototype, "taxTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'grand_total', type: 'numeric', precision: 14, scale: 2 }),
    __metadata("design:type", String)
], Sale.prototype, "grandTotal", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20 }),
    __metadata("design:type", String)
], Sale.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", Object)
], Sale.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => user_entity_1.User),
    (0, typeorm_1.JoinColumn)({ name: 'cashier_id' }),
    __metadata("design:type", user_entity_1.User)
], Sale.prototype, "cashier", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => customer_entity_1.Customer, (customer) => customer.sales),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", Object)
], Sale.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => sale_item_entity_1.SaleItem, (item) => item.sale, { cascade: true }),
    __metadata("design:type", Array)
], Sale.prototype, "items", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => payment_entity_1.Payment, (payment) => payment.sale, { cascade: true }),
    __metadata("design:type", Array)
], Sale.prototype, "payments", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Sale.prototype, "createdAt", void 0);
exports.Sale = Sale = __decorate([
    (0, typeorm_1.Entity)('sales')
], Sale);
//# sourceMappingURL=sale.entity.js.map