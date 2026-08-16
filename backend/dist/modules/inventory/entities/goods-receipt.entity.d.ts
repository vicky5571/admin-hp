import { User } from '../../users/entities/user.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';
export declare class GoodsReceipt {
    id: number;
    grnNumber: string;
    purchaseOrderId: number;
    receiveDate: Date;
    receivedBy: number;
    notes: string | null;
    createdAt: Date;
    purchaseOrder: PurchaseOrder;
    receiver: User;
    items: GoodsReceiptItem[];
}
