import { MovementType } from '../../../common/enums/movement-type.enum';
import { Product } from '../../catalog/entities/product.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { User } from '../../users/entities/user.entity';
export declare class StockMovement {
    id: number;
    movementTime: Date;
    productId: number;
    imeiUnitId: number | null;
    movementType: MovementType;
    qty: number;
    unitCost: string | null;
    refType: string;
    refId: number;
    reasonCode: string | null;
    createdBy: number;
    notes: string | null;
    product: Product;
    imeiUnit: ImeiUnit | null;
    creator: User;
}
