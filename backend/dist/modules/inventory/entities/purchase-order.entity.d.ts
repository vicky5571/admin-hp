import { PoPaymentStatus } from '../../../common/enums/po-payment-status.enum';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { User } from '../../users/entities/user.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
export declare class PurchaseOrder {
    id: number;
    poNumber: string;
    supplierId: number | null;
    status: PoStatus;
    paymentStatus: PoPaymentStatus;
    paymentDueDate: string | null;
    paidAmount: string;
    paidAt: Date | null;
    orderDate: string;
    expectedDate: string | null;
    notes: string | null;
    createdBy: number;
    createdAt: Date;
    updatedAt: Date;
    supplier: Supplier | null;
    creator: User;
    items: PurchaseOrderItem[];
}
