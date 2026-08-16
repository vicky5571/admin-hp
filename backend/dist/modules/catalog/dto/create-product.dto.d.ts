import { ProductType } from '../../../common/enums/product-type.enum';
export declare class CreateProductDto {
    sku: string;
    name: string;
    categoryId?: number;
    brandId?: number;
    productType: ProductType;
    costPrice: number;
    sellingPrice: number;
    taxClassId?: number;
    minStockAlert?: number;
    isActive?: boolean;
}
