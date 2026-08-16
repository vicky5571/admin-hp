import { Product } from '../../catalog/entities/product.entity';
export declare class StockBalance {
    productId: number;
    onHandQty: number;
    reservedQty: number;
    product: Product;
    updatedAt: Date;
}
