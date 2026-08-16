import { PaymentMethod } from '../../../common/enums/payment-method.enum';
import { Sale } from './sale.entity';
export declare class Payment {
    id: number;
    saleId: number;
    method: PaymentMethod;
    amount: string;
    referenceNo: string | null;
    sale: Sale;
    paidAt: Date;
}
