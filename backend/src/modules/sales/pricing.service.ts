import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSaleDto, QuoteSaleDto } from './dto/create-sale.dto';

@Injectable()
export class PricingService {
  quote(dto: QuoteSaleDto) {
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

  validateClientTotals(dto: CreateSaleDto) {
    const quoted = this.quote(dto as QuoteSaleDto);

    if (
      quoted.subtotal !== dto.subtotal ||
      quoted.discountTotal !== dto.discountTotal ||
      quoted.taxTotal !== dto.taxTotal ||
      quoted.grandTotal !== dto.grandTotal
    ) {
      throw new BadRequestException('Client totals mismatch');
    }
  }
}
