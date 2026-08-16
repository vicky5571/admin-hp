import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListReturnsQueryDto extends PaginationQueryDto {
    saleId?: number;
    dateFrom?: string;
    dateTo?: string;
    status?: string;
}
