import { AuthUser } from '../../common/types/auth-user.type';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ValidateReturnDto } from './dto/validate-return.dto';
import { ReturnsService } from './returns.service';
export declare class ReturnsController {
    private readonly service;
    constructor(service: ReturnsService);
    validate(dto: ValidateReturnDto): Promise<{
        invoiceNumber: string;
        saleId: number;
        saleStatus: import("../../common/enums/sale-status.enum").SaleStatus.COMPLETED;
        items: {
            saleItemId: number;
            eligible: boolean;
            maxRefundable: number;
            reason?: string;
        }[];
    }>;
    create(dto: CreateReturnDto, user: AuthUser): Promise<import("./entities/return.entity").Return>;
    findAll(query: ListReturnsQueryDto): Promise<{
        data: import("./entities/return.entity").Return[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<import("./entities/return.entity").Return>;
}
