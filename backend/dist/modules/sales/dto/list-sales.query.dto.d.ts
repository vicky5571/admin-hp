import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
export declare class ListSalesQueryDto extends PaginationQueryDto {
    dateFrom?: string;
    dateTo?: string;
    cashierId?: number;
    status?: string;
    invoiceNumber?: string;
}
