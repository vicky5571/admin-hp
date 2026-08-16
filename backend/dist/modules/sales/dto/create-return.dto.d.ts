import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { RestockType } from '../../../common/enums/restock-type.enum';
export declare class CreateReturnItemDto {
    saleItemId: number;
    productId: number;
    qty: number;
    unitRefund: number;
    lineRefundTotal: number;
    restockType: RestockType;
    imeis?: string[];
}
export declare class CreateReturnDto {
    saleId: number;
    reason: string;
    refundMethod: RefundMethod;
    items: CreateReturnItemDto[];
}
