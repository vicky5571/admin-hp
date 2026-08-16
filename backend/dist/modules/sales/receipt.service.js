"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptService = void 0;
const common_1 = require("@nestjs/common");
let ReceiptService = class ReceiptService {
    buildReceiptPayload(sale) {
        return {
            invoiceNumber: sale.invoiceNumber,
            saleTime: sale.saleTime,
            subtotal: sale.subtotal,
            discountTotal: sale.discountTotal,
            taxTotal: sale.taxTotal,
            grandTotal: sale.grandTotal,
            items: sale.items,
            payments: sale.payments,
        };
    }
};
exports.ReceiptService = ReceiptService;
exports.ReceiptService = ReceiptService = __decorate([
    (0, common_1.Injectable)()
], ReceiptService);
//# sourceMappingURL=receipt.service.js.map