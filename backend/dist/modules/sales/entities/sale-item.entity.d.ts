import { Product } from '../../catalog/entities/product.entity';
import { Sale } from './sale.entity';
import { SaleItemImei } from './sale-item-imei.entity';
export declare class SaleItem {
    id: number;
    saleId: number;
    productId: number;
    qty: number;
    unitPrice: string;
    discountAmount: string;
    taxAmount: string;
    lineTotal: string;
    sale: Sale;
    product: Product;
    imeis: SaleItemImei[];
}
