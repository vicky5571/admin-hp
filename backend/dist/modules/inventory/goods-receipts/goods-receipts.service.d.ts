import { DataSource, Repository } from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from '../dto/list-goods-receipts.query.dto';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
export declare class GoodsReceiptsService {
    private readonly grRepo;
    private readonly poRepo;
    private readonly poItemRepo;
    private readonly productRepo;
    private readonly imeiRepo;
    private readonly dataSource;
    private readonly auditLogsService;
    constructor(grRepo: Repository<GoodsReceipt>, poRepo: Repository<PurchaseOrder>, poItemRepo: Repository<PurchaseOrderItem>, productRepo: Repository<Product>, imeiRepo: Repository<ImeiUnit>, dataSource: DataSource, auditLogsService: AuditLogsService);
    findAll(query: ListGoodsReceiptsQueryDto): Promise<{
        data: GoodsReceipt[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<GoodsReceipt>;
    create(dto: CreateGoodsReceiptDto, userId: number): Promise<GoodsReceipt>;
    private generateGrnNumber;
}
