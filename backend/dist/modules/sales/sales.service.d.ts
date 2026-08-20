import { DataSource, Repository } from 'typeorm';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales.query.dto';
import { Customer } from './entities/customer.entity';
import { Payment } from './entities/payment.entity';
import { SaleItem } from './entities/sale-item.entity';
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
    create(dto: CreateSaleDto, user: AuthUser): Promise<{
        paidTotal: string;
        change: string;
        id?: number | undefined;
        invoiceNumber?: string | undefined;
        saleTime?: Date | undefined;
        cashierId?: number | undefined;
        customerId?: number | null | undefined;
        subtotal?: string | undefined;
        discountTotal?: string | undefined;
        taxTotal?: string | undefined;
        grandTotal?: string | undefined;
        status?: SaleStatus | undefined;
        notes?: string | null | undefined;
        cashier?: import("../users/entities/user.entity").User | undefined;
        customer?: Customer | null | undefined;
        items?: SaleItem[] | undefined;
        payments?: Payment[] | undefined;
        createdAt?: Date | undefined;
    }>;
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
    voidSale(id: number, user: AuthUser): Promise<Sale>;
    private generateInvoiceNumber;
}
