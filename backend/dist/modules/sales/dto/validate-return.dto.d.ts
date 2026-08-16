export declare class ValidateReturnItemDto {
    saleItemId: number;
    qty: number;
    imeis: string[];
}
export declare class ValidateReturnDto {
    invoiceNumber: string;
    items: ValidateReturnItemDto[];
}
