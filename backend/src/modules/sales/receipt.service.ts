import { Injectable } from '@nestjs/common';
import { Sale } from './entities/sale.entity';

@Injectable()
export class ReceiptService {
  buildReceiptPayload(sale: Sale) {
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
}
