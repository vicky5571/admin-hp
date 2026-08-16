import { RestockType } from '../../../common/enums/restock-type.enum';
import { Product } from '../../catalog/entities/product.entity';
import { Return } from './return.entity';
import { ReturnItemImei } from './return-item-imei.entity';
import { SaleItem } from './sale-item.entity';
export declare class ReturnItem {
    id: number;
    returnId: number;
    saleItemId: number;
    productId: number;
    qty: number;
    unitRefund: string;
    lineRefundTotal: string;
    restockType: RestockType;
    ret: Return;
    saleItem: SaleItem;
    product: Product;
    imeis: ReturnItemImei[];
}
