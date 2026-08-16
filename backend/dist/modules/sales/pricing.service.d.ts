import { CreateSaleDto } from './dto/create-sale.dto';
export declare class PricingService {
    quote(dto: CreateSaleDto): {
        subtotal: number;
        discountTotal: number;
        taxTotal: number;
        grandTotal: number;
    };
    validateClientTotals(dto: CreateSaleDto): void;
}
