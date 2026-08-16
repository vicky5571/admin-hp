import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListPurchaseOrdersQueryDto extends PaginationQueryDto {
    supplierId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}
