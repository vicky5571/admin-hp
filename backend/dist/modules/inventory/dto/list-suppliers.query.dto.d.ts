import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListSuppliersQueryDto extends PaginationQueryDto {
    q?: string;
    isActive?: boolean;
}
