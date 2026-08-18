import { DataSource, Repository } from 'typeorm';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
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
    update(id: number, dto: UpdatePurchaseOrderDto, userId: number): Promise<number | PurchaseOrder>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    submit(id: number): Promise<PurchaseOrder>;
    approve(id: number): Promise<PurchaseOrder>;
    reject(id: number, reason?: string): Promise<PurchaseOrder>;
    cancel(id: number): Promise<PurchaseOrder>;
    private generatePoNumber;
}
