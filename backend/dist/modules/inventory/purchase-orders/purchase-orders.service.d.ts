import { DataSource, Repository } from 'typeorm';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Supplier } from '../entities/supplier.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
export declare class PurchaseOrdersService {
    private readonly poRepo;
    private readonly supplierRepo;
    private readonly dataSource;
    private readonly auditLogsService;
    constructor(poRepo: Repository<PurchaseOrder>, supplierRepo: Repository<Supplier>, dataSource: DataSource, auditLogsService: AuditLogsService);
    findAll(query: ListPurchaseOrdersQueryDto): Promise<{
        data: PurchaseOrder[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<PurchaseOrder>;
    create(dto: CreatePurchaseOrderDto, userId: number): Promise<PurchaseOrder>;
    update(id: number, dto: UpdatePurchaseOrderDto, userId: number): Promise<PurchaseOrder>;
    remove(id: number, userId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    submit(id: number, userId?: number): Promise<PurchaseOrder>;
    approve(id: number, userId?: number): Promise<PurchaseOrder>;
    reject(id: number, reason?: string, userId?: number): Promise<PurchaseOrder>;
    cancel(id: number, userId?: number): Promise<PurchaseOrder>;
    private generatePoNumber;
}
