export declare class CreatePoItemDto {
    productId: number;
    orderedQty: number;
    unitCost: number;
}
export declare class CreatePurchaseOrderDto {
    supplierId: number;
    orderDate: string;
    expectedDate?: string;
    notes?: string;
    items: CreatePoItemDto[];
}
