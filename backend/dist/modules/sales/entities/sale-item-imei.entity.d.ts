import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { SaleItem } from './sale-item.entity';
export declare class SaleItemImei {
    id: number;
    saleItemId: number;
    imeiUnitId: number;
    saleItem: SaleItem;
    imeiUnit: ImeiUnit;
    createdAt: Date;
}
