import { DataSource, Repository } from 'typeorm';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ValidateReturnDto } from './dto/validate-return.dto';
import { Return } from './entities/return.entity';
import { Sale } from './entities/sale.entity';
export declare class ReturnsService {
    private readonly dataSource;
    private readonly returnsRepo;
    private readonly salesRepo;
    private readonly productRepo;
    private readonly imeiRepo;
    constructor(dataSource: DataSource, returnsRepo: Repository<Return>, salesRepo: Repository<Sale>, productRepo: Repository<Product>, imeiRepo: Repository<ImeiUnit>);
    validate(dto: ValidateReturnDto): Promise<{
        invoiceNumber: string;
        saleId: number;
        saleStatus: SaleStatus.COMPLETED;
        items: {
            saleItemId: number;
            eligible: boolean;
            maxRefundable: number;
            reason?: string;
        }[];
    }>;
    create(dto: CreateReturnDto, user: AuthUser): Promise<Return>;
    findAll(query: ListReturnsQueryDto): Promise<{
        data: Return[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<Return>;
    private generateReturnNumber;
}
