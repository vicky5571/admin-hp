import { SaleStatus } from '../../../common/enums/sale-status.enum';
import { User } from '../../users/entities/user.entity';
import { Customer } from './customer.entity';
import { Payment } from './payment.entity';
import { SaleItem } from './sale-item.entity';
export declare class Sale {
    id: number;
    invoiceNumber: string;
    saleTime: Date;
    cashierId: number;
    customerId: number | null;
    subtotal: string;
    discountTotal: string;
    taxTotal: string;
    grandTotal: string;
    status: SaleStatus;
    notes: string | null;
    cashier: User;
    customer: Customer | null;
    items: SaleItem[];
    payments: Payment[];
    createdAt: Date;
}
