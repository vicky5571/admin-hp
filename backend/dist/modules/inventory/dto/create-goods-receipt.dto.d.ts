export declare class ReceiveGrItemDto {
    poItemId: number;
    productId: number;
    receivedQty: number;
    unitCost: number;
    imeis?: string[];
}
export declare class CreateGoodsReceiptDto {
    purchaseOrderId: number;
    receiveDate: string;
    notes?: string;
    items: ReceiveGrItemDto[];
}
