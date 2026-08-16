import { DataSource, Repository } from 'typeorm';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Supplier } from '../entities/supplier.entity';
export declare class PurchaseOrdersService {
    private readonly poRepo;
    private readonly supplierRepo;
    private readonly dataSource;
    constructor(poRepo: Repository<PurchaseOrder>, supplierRepo: Repository<Supplier>, dataSource: DataSource);
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
    submit(id: number): Promise<PurchaseOrder>;
    cancel(id: number): Promise<PurchaseOrder>;
    private generatePoNumber;
}
