import { PaymentMethod } from '../../../common/enums/payment-method.enum';
export declare class CreateSaleItemDto {
    productId: number;
    qty: number;
    unitPrice: number;
    discountAmount: number;
    taxAmount: number;
    lineTotal: number;
    imeis?: string[];
}
export declare class QuoteSaleItemDto {
    productId: number;
    qty: number;
    unitPrice: number;
    discountAmount?: number;
    taxAmount?: number;
    lineTotal?: number;
    imeis?: string[];
}
export declare class CreatePaymentDto {
    method: PaymentMethod;
    amount: number;
    referenceNo?: string;
}
export declare class CreateSaleDto {
    customerId?: number;
    items: CreateSaleItemDto[];
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
    payments: CreatePaymentDto[];
    notes?: string;
}
export declare class QuoteSaleDto {
    items: QuoteSaleItemDto[];
    cartDiscountValue?: number;
}
