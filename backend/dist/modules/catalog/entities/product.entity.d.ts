import { ProductType } from '../../../common/enums/product-type.enum';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { TaxClass } from './tax-class.entity';
export declare class Product {
    id: number;
    sku: string;
    name: string;
    categoryId: number | null;
    brandId: number | null;
    productType: ProductType;
    costPrice: string;
    sellingPrice: string;
    taxClassId: number | null;
    minStockAlert: number;
    isActive: boolean;
    category: Category | null;
    brand: Brand | null;
    taxClass: TaxClass | null;
    createdAt: Date;
    updatedAt: Date;
}
