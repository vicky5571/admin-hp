import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListAuditLogsQueryDto extends PaginationQueryDto {
    userId?: number;
    action?: string;
    entityType?: string;
    dateFrom?: string;
    dateTo?: string;
}
