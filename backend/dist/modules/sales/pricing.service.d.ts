import { CreateSaleDto, QuoteSaleDto } from './dto/create-sale.dto';
export declare class PricingService {
    quote(dto: QuoteSaleDto): {
        subtotal: number;
        discountTotal: number;
        taxTotal: number;
        grandTotal: number;
        items: {
            productId: number;
            qty: number;
            unitPrice: number;
            discountAmount: number;
            taxAmount: number;
            lineTotal: number;
        }[];
    };
    validateClientTotals(dto: CreateSaleDto): void;
}
