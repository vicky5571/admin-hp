import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';
export declare class GoodsReceiptItemImei {
    id: number;
    goodsReceiptItemId: number;
    imeiUnitId: number;
    createdAt: Date;
    goodsReceiptItem: GoodsReceiptItem;
    imeiUnit: ImeiUnit;
}
