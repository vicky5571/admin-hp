import { DataSource } from 'typeorm';
import { DateRangeQueryDto, ReportPeriod, SalesSummaryQueryDto, StockOnHandQueryDto, StockMovementsQueryDto } from './dto/reports.dto';
export declare class ReportsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    salesSummary(query: SalesSummaryQueryDto): Promise<{
        period: ReportPeriod;
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
    private buildCsv;
    salesSummaryCsv(query: SalesSummaryQueryDto): Promise<string>;
    salesByProductCsv(query: DateRangeQueryDto): Promise<string>;
    salesByCashierCsv(query: DateRangeQueryDto): Promise<string>;
    paymentBreakdownCsv(query: DateRangeQueryDto): Promise<string>;
    grossProfitCsv(query: DateRangeQueryDto): Promise<string>;
    stockOnHandCsv(query: StockOnHandQueryDto): Promise<string>;
    returnsSummaryCsv(query: DateRangeQueryDto): Promise<string>;
}
