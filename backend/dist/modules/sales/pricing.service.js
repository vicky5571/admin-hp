"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PricingService = void 0;
const common_1 = require("@nestjs/common");
let PricingService = class PricingService {
    quote(dto) {
        const computedSubtotal = dto.items.reduce((acc, item) => acc + item.unitPrice * item.qty, 0);
        const computedDiscount = dto.items.reduce((acc, item) => acc + item.discountAmount, 0);
        const computedTax = dto.items.reduce((acc, item) => acc + item.taxAmount, 0);
        const computedGrand = computedSubtotal - computedDiscount + computedTax;
        return {
            subtotal: computedSubtotal,
            discountTotal: computedDiscount,
            taxTotal: computedTax,
            grandTotal: computedGrand,
        };
    }
    validateClientTotals(dto) {
        const quoted = this.quote(dto);
        if (quoted.subtotal !== dto.subtotal ||
            quoted.discountTotal !== dto.discountTotal ||
            quoted.taxTotal !== dto.taxTotal ||
            quoted.grandTotal !== dto.grandTotal) {
            throw new common_1.BadRequestException('Client totals mismatch');
        }
    }
};
exports.PricingService = PricingService;
exports.PricingService = PricingService = __decorate([
    (0, common_1.Injectable)()
], PricingService);
//# sourceMappingURL=pricing.service.js.map