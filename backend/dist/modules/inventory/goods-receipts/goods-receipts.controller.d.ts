import { AuthUser } from '../../../common/types/auth-user.type';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from '../dto/list-goods-receipts.query.dto';
import { GoodsReceiptsService } from './goods-receipts.service';
export declare class GoodsReceiptsController {
    private readonly service;
    constructor(service: GoodsReceiptsService);
    findAll(query: ListGoodsReceiptsQueryDto): Promise<{
        data: import("../entities/goods-receipt.entity").GoodsReceipt[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<import("../entities/goods-receipt.entity").GoodsReceipt>;
    create(dto: CreateGoodsReceiptDto, user: AuthUser): Promise<import("../entities/goods-receipt.entity").GoodsReceipt>;
}
