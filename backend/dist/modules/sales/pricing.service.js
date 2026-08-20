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
        let computedSubtotal = 0;
        let computedDiscount = 0;
        let computedTax = 0;
        const items = dto.items.map((item) => {
            const unitPrice = item.unitPrice;
            const qty = item.qty;
            const rawSub = unitPrice * qty;
            const discount = item.discountAmount ?? 0;
            const discountedSub = Math.max(0, rawSub - discount);
            const tax = item.taxAmount ?? 0;
            const lineTotal = item.lineTotal ?? (discountedSub + tax);
            computedSubtotal += rawSub;
            computedDiscount += discount;
            computedTax += tax;
            return {
                productId: item.productId,
                qty,
                unitPrice,
                discountAmount: discount,
                taxAmount: tax,
                lineTotal,
            };
        });
        const computedGrand = computedSubtotal - computedDiscount + computedTax;
        return {
            subtotal: computedSubtotal,
            discountTotal: computedDiscount,
            taxTotal: computedTax,
            grandTotal: computedGrand,
            items,
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