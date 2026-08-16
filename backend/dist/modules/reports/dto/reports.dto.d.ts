export declare enum ReportPeriod {
    DAILY = "daily",
    WEEKLY = "weekly",
    MONTHLY = "monthly"
}
export declare class SalesSummaryQueryDto {
    period?: ReportPeriod;
    dateFrom?: string;
    dateTo?: string;
}
export declare class DateRangeQueryDto {
    dateFrom?: string;
    dateTo?: string;
}
export declare class StockOnHandQueryDto {
    q?: string;
    categoryId?: string;
    lowStockOnly?: string;
}
export declare class StockMovementsQueryDto {
    productId?: string;
    imei?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    page?: string;
    limit?: string;
}
