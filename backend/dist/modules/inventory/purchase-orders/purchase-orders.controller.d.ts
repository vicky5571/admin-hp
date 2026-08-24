import { AuthUser } from '../../../common/types/auth-user.type';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ExpressBuybackDto } from '../dto/express-buyback.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { RecordPoPaymentDto } from '../dto/record-po-payment.dto';
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
    getApKpis(): Promise<{
        monthPeriod: {
            from: string;
            to: string;
        };
        totalProcurementThisMonth: number;
        newStockOutlayThisMonth: number;
        usedBuybackOutlayThisMonth: number;
        poCountThisMonth: number;
        outstandingPayables: number;
        overduePayables: number;
        overdueCount: number;
        pendingGoodsReceiptCount: number;
    }>;
    imeiTrace(imei: string): Promise<{
        imeiUnit: {
            id: number;
            imei: string;
            status: import("../../../common/enums/imei-status.enum").ImeiStatus;
            conditionGrade: string | null;
            batteryHealth: number | null;
            costPrice: number | null;
            sellingPrice: number | null;
            createdAt: Date;
        };
        product: {
            id: number;
            sku: string;
            name: string;
            brand: string | undefined;
            category: string | undefined;
        };
        source: {
            type: string;
            supplierName: string;
            supplierCode: string | null;
        };
        procurement: {
            id: number;
            poNumber: string;
            orderDate: string;
            unitCost: number;
            actualUnitCost: number | null;
            status: import("../../../common/enums/po-status.enum").PoStatus;
            notes: string | null;
            createdBy: string;
        } | null;
        receiving: {
            id: number;
            grnNumber: string;
            receiveDate: Date;
            receivedBy: string;
            conditionStatus: string;
            conditionNotes: string | null;
        } | null;
        salesInfo: {
            id: any;
            saleNumber: any;
            saleTime: any;
            customerName: any;
            customerPhone: any;
            unitPrice: number;
            cashierName: any;
        } | null;
    }>;
    expressBuyback(dto: ExpressBuybackDto, user: AuthUser): Promise<{
        purchaseOrder: import("../entities/purchase-order.entity").PurchaseOrder;
        goodsReceipt: import("../entities/goods-receipt.entity").GoodsReceipt;
        imeiUnit: import("../../imei/entities/imei-unit.entity").ImeiUnit;
    }>;
    findOne(id: number): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
    recordPayment(id: number, dto: RecordPoPaymentDto, user: AuthUser): Promise<import("../entities/purchase-order.entity").PurchaseOrder>;
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
