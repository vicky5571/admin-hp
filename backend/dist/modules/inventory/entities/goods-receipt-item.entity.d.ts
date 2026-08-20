import { Product } from '../../catalog/entities/product.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { GoodsReceiptItemImei } from './goods-receipt-item-imei.entity';
export declare class GoodsReceiptItem {
    id: number;
    goodsReceiptId: number;
    poItemId: number;
    productId: number;
    receivedQty: number;
    unitCost: string;
    actualUnitCost: string | null;
    conditionStatus: string;
    conditionNotes: string | null;
    goodsReceipt: GoodsReceipt;
    poItem: PurchaseOrderItem;
    product: Product;
    imeis: GoodsReceiptItemImei[];
}
