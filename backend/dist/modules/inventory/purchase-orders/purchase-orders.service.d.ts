import { DataSource, Repository } from 'typeorm';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ExpressBuybackDto } from '../dto/express-buyback.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { RecordPoPaymentDto } from '../dto/record-po-payment.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { Supplier } from '../entities/supplier.entity';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
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
    imeiTrace(imei: string): Promise<{
        imeiUnit: {
            id: number;
            imei: string;
            status: ImeiStatus;
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
            status: PoStatus;
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
    expressBuyback(dto: ExpressBuybackDto, userId: number): Promise<{
        purchaseOrder: PurchaseOrder;
        goodsReceipt: GoodsReceipt;
        imeiUnit: ImeiUnit;
    }>;
    recordPayment(id: number, dto: RecordPoPaymentDto, userId: number): Promise<PurchaseOrder>;
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
    private generatePoNumber;
    private generateGrnNumber;
}
