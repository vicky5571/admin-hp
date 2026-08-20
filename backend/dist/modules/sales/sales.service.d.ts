import { DataSource, Repository } from 'typeorm';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales.query.dto';
import { Customer } from './entities/customer.entity';
import { Sale } from './entities/sale.entity';
import { PricingService } from './pricing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class SalesService {
    private readonly dataSource;
    private readonly salesRepo;
    private readonly productsRepo;
    private readonly imeiRepo;
    private readonly customerRepo;
    private readonly pricingService;
    private readonly auditLogsService;
    constructor(dataSource: DataSource, salesRepo: Repository<Sale>, productsRepo: Repository<Product>, imeiRepo: Repository<ImeiUnit>, customerRepo: Repository<Customer>, pricingService: PricingService, auditLogsService: AuditLogsService);
    create(dto: CreateSaleDto, user: AuthUser): Promise<any>;
    findAll(query: ListSalesQueryDto): Promise<{
        data: Sale[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<Sale>;
    voidSale(id: number, user: AuthUser): Promise<any>;
    private generateInvoiceNumber;
}
