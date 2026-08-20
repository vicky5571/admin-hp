export declare class GrImeiUnitDto {
    imei: string;
    conditionGrade?: string;
    batteryHealth?: number;
}
export declare class ReceiveGrItemDto {
    poItemId: number;
    productId: number;
    receivedQty: number;
    unitCost: number;
    actualUnitCost?: number;
    conditionStatus?: string;
    conditionNotes?: string;
    imeis?: string[];
    imeiUnits?: GrImeiUnitDto[];
}
export declare class CreateGoodsReceiptDto {
    purchaseOrderId: number;
    receiveDate: string;
    notes?: string;
    supplierDoNumber?: string;
    carrierName?: string;
    trackingNumber?: string;
    items: ReceiveGrItemDto[];
}
