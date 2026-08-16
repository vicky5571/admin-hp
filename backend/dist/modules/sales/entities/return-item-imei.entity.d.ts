import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { ReturnItem } from './return-item.entity';
export declare class ReturnItemImei {
    id: number;
    returnItemId: number;
    imeiUnitId: number;
    createdAt: Date;
    returnItem: ReturnItem;
    imeiUnit: ImeiUnit;
}
