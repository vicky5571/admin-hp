import { PoStatus } from '../../../common/enums/po-status.enum';
import { User } from '../../users/entities/user.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
export declare class PurchaseOrder {
    id: number;
    poNumber: string;
    supplierId: number;
    status: PoStatus;
    orderDate: string;
    expectedDate: string | null;
    notes: string | null;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
    supplier: Supplier;
    creator: User;
    items: PurchaseOrderItem[];
}
