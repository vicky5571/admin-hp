import { DateRangeQueryDto, SalesSummaryQueryDto, StockMovementsQueryDto, StockOnHandQueryDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';
export declare class ReportsController {
    private readonly service;
    constructor(service: ReportsService);
    salesSummary(query: SalesSummaryQueryDto): Promise<{
        period: import("./dto/reports.dto").ReportPeriod;
        data: any;
    }>;
    salesByProduct(query: DateRangeQueryDto): Promise<{
        data: any;
    }>;
    salesByCashier(query: DateRangeQueryDto): Promise<{
        data: any;
    }>;
    paymentBreakdown(query: DateRangeQueryDto): Promise<{
        data: any;
    }>;
    grossProfit(query: DateRangeQueryDto): Promise<{
        summary: {
            totalRevenue: any;
            totalCost: any;
            totalGrossProfit: any;
            overallMargin: number;
        };
        data: any[];
    }>;
    stockOnHand(query: StockOnHandQueryDto): Promise<{
        summary: {
            totalSkus: number;
            totalStockValue: any;
            lowStockCount: number;
        };
        data: any[];
    }>;
    stockMovements(query: StockMovementsQueryDto): Promise<{
        data: any;
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    returnsSummary(query: DateRangeQueryDto): Promise<{
        summary: {
            totalReturns: any;
            totalRefunded: any;
        };
        byDay: any[];
        byMethod: any[];
    }>;
}
