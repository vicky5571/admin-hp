import { RefundMethod } from '../../../common/enums/refund-method.enum';
import { ReturnStatus } from '../../../common/enums/return-status.enum';
import { User } from '../../users/entities/user.entity';
import { Sale } from './sale.entity';
import { ReturnItem } from './return-item.entity';
export declare class Return {
    id: number;
    returnNumber: string;
    saleId: number;
    processedBy: number;
    returnTime: Date;
    refundTotal: string;
    refundMethod: RefundMethod;
    status: ReturnStatus;
    reason: string;
    createdAt: Date;
    sale: Sale;
    processor: User;
    items: ReturnItem[];
}
