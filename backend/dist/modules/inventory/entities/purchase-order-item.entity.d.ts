import { Product } from '../../catalog/entities/product.entity';
import { PurchaseOrder } from './purchase-order.entity';
export declare class PurchaseOrderItem {
    id: number;
    purchaseOrderId: number;
    productId: number;
    orderedQty: number;
    receivedQty: number;
    unitCost: string;
    purchaseOrder: PurchaseOrder;
    product: Product;
}
