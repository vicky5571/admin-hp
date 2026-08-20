import { AuthUser } from '../../../common/types/auth-user.type';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { RejectPurchaseOrderDto, UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrdersService } from './purchase-orders.service';
export declare class PurchaseOrdersController {
    private readonly service;
    constructor(service: PurchaseOrdersService);
    findAll(query: ListPurchaseOrdersQueryDto): Promise<{
        data: import("../entities/purchase-order.entity").PurchaseOrder[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    create(dto: CreatePurchaseOrderDto, user: AuthUser): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    update(id: number, dto: UpdatePurchaseOrderDto, user: AuthUser): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    remove(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    submit(id: number): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    approve(id: number): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    reject(id: number, dto?: RejectPurchaseOrderDto): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    cancel(id: number): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
}
