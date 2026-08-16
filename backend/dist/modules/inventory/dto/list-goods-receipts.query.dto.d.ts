import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListGoodsReceiptsQueryDto extends PaginationQueryDto {
    purchaseOrderId?: number;
    dateFrom?: string;
    dateTo?: string;
}
