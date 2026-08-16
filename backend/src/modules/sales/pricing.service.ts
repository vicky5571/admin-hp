import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateSaleDto } from './dto/create-sale.dto';

@Injectable()
export class PricingService {
  quote(dto: CreateSaleDto) {
    const computedSubtotal = dto.items.reduce(
      (acc, item) => acc + item.unitPrice * item.qty,
      0,
    );

    const computedDiscount = dto.items.reduce(
      (acc, item) => acc + item.discountAmount,
      0,
    );

    const computedTax = dto.items.reduce((acc, item) => acc + item.taxAmount, 0);

    const computedGrand = computedSubtotal - computedDiscount + computedTax;

    return {
      subtotal: computedSubtotal,
      discountTotal: computedDiscount,
      taxTotal: computedTax,
      grandTotal: computedGrand,
    };
  }

  validateClientTotals(dto: CreateSaleDto) {
    const quoted = this.quote(dto);

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
