import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { Product } from '../../catalog/entities/product.entity';
export declare class ImeiUnit {
    id: number;
    imei: string;
    productId: number;
    status: ImeiStatus;
    currentLocation: string;
    conditionGrade: string | null;
    batteryHealth: number | null;
    lastRefType: string | null;
    lastRefId: number | null;
    product: Product;
    createdAt: Date;
    updatedAt: Date;
}
