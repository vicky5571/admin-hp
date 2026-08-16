import { ProductType } from '../../../common/enums/product-type.enum';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListProductsQueryDto extends PaginationQueryDto {
    q?: string;
    categoryId?: number;
    brandId?: number;
    productType?: ProductType;
    isActive?: boolean;
}
