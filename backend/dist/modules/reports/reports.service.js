"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const pagination_util_1 = require("../../common/utils/pagination.util");
const reports_dto_1 = require("./dto/reports.dto");
let ReportsService = class ReportsService {
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async salesSummary(query) {
        const period = query.period ?? reports_dto_1.ReportPeriod.DAILY;
        const dateTrunc = period === reports_dto_1.ReportPeriod.MONTHLY
            ? 'month'
            : period === reports_dto_1.ReportPeriod.WEEKLY
                ? 'week'
                : 'day';
        const params = [];
        let whereClause = `WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND s.sale_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND s.sale_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        date_trunc('${dateTrunc}', s.sale_time) AS period_start,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(s.subtotal), 0)::numeric(14,2) AS subtotal,
        COALESCE(SUM(s.discount_total), 0)::numeric(14,2) AS discount_total,
        COALESCE(SUM(s.tax_total), 0)::numeric(14,2) AS tax_total,
        COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS grand_total
      FROM sales s
      ${whereClause}
      GROUP BY period_start
      ORDER BY period_start ASC
    `;
        const rows = await this.dataSource.query(sql, params);
        return { period, data: rows };
    }
    async salesByProduct(query) {
        const params = [];
        let whereClause = `WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND s.sale_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND s.sale_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        si.product_id,
        p.sku,
        p.name AS product_name,
        b.name AS brand_name,
        SUM(si.qty)::int AS qty_sold,
        COALESCE(SUM(si.line_total - si.discount_amount), 0)::numeric(14,2) AS net_sales,
        COALESCE(SUM(si.discount_amount), 0)::numeric(14,2) AS total_discount
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      LEFT JOIN brands b ON b.id = p.brand_id
      ${whereClause}
      GROUP BY si.product_id, p.sku, p.name, b.name
      ORDER BY net_sales DESC
    `;
        const rows = await this.dataSource.query(sql, params);
        return { data: rows };
    }
    async salesByCashier(query) {
        const params = [];
        let whereClause = `WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND s.sale_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND s.sale_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        s.cashier_id,
        u.full_name AS cashier_name,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(s.grand_total), 0)::numeric(14,2) AS total_sales
      FROM sales s
      JOIN users u ON u.id = s.cashier_id
      ${whereClause}
      GROUP BY s.cashier_id, u.full_name
      ORDER BY total_sales DESC
    `;
        const rows = await this.dataSource.query(sql, params);
        return { data: rows };
    }
    async paymentBreakdown(query) {
        const params = [];
        let whereClause = `WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND s.sale_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND s.sale_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        p.method,
        COUNT(*)::int AS transaction_count,
        COALESCE(SUM(p.amount), 0)::numeric(14,2) AS total_amount
      FROM payments p
      JOIN sales s ON s.id = p.sale_id
      ${whereClause}
      GROUP BY p.method
      ORDER BY total_amount DESC
    `;
        const rows = await this.dataSource.query(sql, params);
        return { data: rows };
    }
    async grossProfit(query) {
        const params = [];
        let whereClause = `WHERE s.status IN ('COMPLETED', 'PARTIALLY_REFUNDED')`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND s.sale_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND s.sale_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        si.product_id,
        p.sku,
        p.name AS product_name,
        SUM(si.qty)::int AS qty_sold,
        COALESCE(SUM(si.line_total - si.discount_amount), 0)::numeric(14,2) AS net_revenue,
        COALESCE(SUM(si.qty * p.cost_price), 0)::numeric(14,2) AS total_cost,
        COALESCE(SUM(si.line_total - si.discount_amount) - SUM(si.qty * p.cost_price), 0)::numeric(14,2) AS gross_profit,
        CASE
          WHEN SUM(si.line_total - si.discount_amount) > 0
          THEN ROUND(
            (SUM(si.line_total - si.discount_amount) - SUM(si.qty * p.cost_price))
            / SUM(si.line_total - si.discount_amount) * 100, 2
          )
          ELSE 0
        END AS margin_percent
      FROM sale_items si
      JOIN sales s ON s.id = si.sale_id
      JOIN products p ON p.id = si.product_id
      ${whereClause}
      GROUP BY si.product_id, p.sku, p.name
      ORDER BY gross_profit DESC
    `;
        const rows = await this.dataSource.query(sql, params);
        const summary = rows.reduce((acc, r) => {
            acc.totalRevenue += parseFloat(r.net_revenue);
            acc.totalCost += parseFloat(r.total_cost);
            acc.totalGrossProfit += parseFloat(r.gross_profit);
            return acc;
        }, { totalRevenue: 0, totalCost: 0, totalGrossProfit: 0 });
        const overallMargin = summary.totalRevenue > 0
            ? Math.round((summary.totalGrossProfit / summary.totalRevenue) * 10000) / 100
            : 0;
        return {
            summary: {
                totalRevenue: summary.totalRevenue.toFixed(2),
                totalCost: summary.totalCost.toFixed(2),
                totalGrossProfit: summary.totalGrossProfit.toFixed(2),
                overallMargin,
            },
            data: rows,
        };
    }
    async stockOnHand(query) {
        const params = [];
        let whereClause = `WHERE 1=1`;
        if (query.q) {
            params.push(`%${query.q}%`);
            whereClause += ` AND (p.sku ILIKE $${params.length} OR p.name ILIKE $${params.length})`;
        }
        if (query.categoryId) {
            params.push(query.categoryId);
            whereClause += ` AND p.category_id = $${params.length}::bigint`;
        }
        if (query.lowStockOnly === 'true') {
            whereClause += ` AND COALESCE(sb.on_hand_qty, 0) <= p.min_stock_alert`;
        }
        const sql = `
      SELECT
        p.id,
        p.sku,
        p.name,
        p.product_type,
        b.name AS brand,
        COALESCE(sb.on_hand_qty, 0)::int AS on_hand_qty,
        COALESCE(sb.reserved_qty, 0)::int AS reserved_qty,
        p.min_stock_alert,
        p.cost_price,
        p.selling_price,
        COALESCE(sb.on_hand_qty, 0) * p.cost_price AS stock_value
      FROM products p
      LEFT JOIN stock_balances sb ON sb.product_id = p.id
      LEFT JOIN brands b ON b.id = p.brand_id
      ${whereClause}
      AND p.is_active = true
      ORDER BY p.name ASC
    `;
        const rows = await this.dataSource.query(sql, params);
        const totalStockValue = rows.reduce((acc, r) => acc + parseFloat(r.stock_value || 0), 0);
        const lowStockCount = rows.filter((r) => r.on_hand_qty <= r.min_stock_alert).length;
        return {
            summary: {
                totalSkus: rows.length,
                totalStockValue: totalStockValue.toFixed(2),
                lowStockCount,
            },
            data: rows,
        };
    }
    async stockMovements(query) {
        const page = parseInt(query.page ?? '1', 10);
        const limit = Math.min(parseInt(query.limit ?? '20', 10), 100);
        const offset = (page - 1) * limit;
        const params = [];
        let whereClause = `WHERE 1=1`;
        if (query.productId) {
            params.push(query.productId);
            whereClause += ` AND sm.product_id = $${params.length}::bigint`;
        }
        if (query.imei) {
            params.push(`%${query.imei}%`);
            whereClause += ` AND iu.imei ILIKE $${params.length}`;
        }
        if (query.movementType) {
            params.push(query.movementType);
            whereClause += ` AND sm.movement_type = $${params.length}`;
        }
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND sm.movement_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND sm.movement_time <= $${params.length}`;
        }
        const countSql = `SELECT COUNT(*)::int AS total FROM stock_movements sm LEFT JOIN imei_units iu ON iu.id = sm.imei_unit_id ${whereClause}`;
        const countResult = await this.dataSource.query(countSql, params);
        const total = countResult[0]?.total ?? 0;
        params.push(limit.toString());
        const limitParam = `$${params.length}`;
        params.push(offset.toString());
        const offsetParam = `$${params.length}`;
        const sql = `
      SELECT
        sm.id,
        sm.movement_time,
        sm.product_id,
        p.sku,
        p.name AS product_name,
        sm.imei_unit_id,
        iu.imei,
        sm.movement_type,
        sm.qty,
        sm.unit_cost,
        sm.ref_type,
        sm.ref_id,
        sm.reason_code,
        sm.notes,
        u.full_name AS created_by_name
      FROM stock_movements sm
      JOIN products p ON p.id = sm.product_id
      LEFT JOIN imei_units iu ON iu.id = sm.imei_unit_id
      LEFT JOIN users u ON u.id = sm.created_by
      ${whereClause}
      ORDER BY sm.movement_time DESC
      LIMIT ${limitParam}::int OFFSET ${offsetParam}::int
    `;
        const rows = await this.dataSource.query(sql, params);
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, page, limit) };
    }
    async returnsSummary(query) {
        const params = [];
        let whereClause = `WHERE r.status = 'COMPLETED'`;
        if (query.dateFrom) {
            params.push(query.dateFrom);
            whereClause += ` AND r.return_time >= $${params.length}`;
        }
        if (query.dateTo) {
            params.push(query.dateTo);
            whereClause += ` AND r.return_time <= $${params.length}`;
        }
        const sql = `
      SELECT
        date_trunc('day', r.return_time) AS period_start,
        COUNT(*)::int AS return_count,
        COALESCE(SUM(r.refund_total), 0)::numeric(14,2) AS total_refunded,
        COUNT(DISTINCT r.sale_id)::int AS affected_sales
      FROM returns r
      ${whereClause}
      GROUP BY period_start
      ORDER BY period_start ASC
    `;
        const rows = await this.dataSource.query(sql, params);
        const byMethodSql = `
      SELECT
        r.refund_method,
        COUNT(*)::int AS return_count,
        COALESCE(SUM(r.refund_total), 0)::numeric(14,2) AS total_refunded
      FROM returns r
      ${whereClause}
      GROUP BY r.refund_method
      ORDER BY total_refunded DESC
    `;
        const byMethod = await this.dataSource.query(byMethodSql, params);
        const totalRefunded = rows.reduce((acc, r) => acc + parseFloat(r.total_refunded || 0), 0);
        return {
            summary: {
                totalReturns: rows.reduce((acc, r) => acc + r.return_count, 0),
                totalRefunded: totalRefunded.toFixed(2),
            },
            byDay: rows,
            byMethod,
        };
    }
    buildCsv(headers, rows) {
        const escape = (v) => {
            if (v === null || v === undefined)
                return '';
            const s = String(v);
            if (s.includes(',') || s.includes('"') || s.includes('\n')) {
                return `"${s.replace(/"/g, '""')}"`;
            }
            return s;
        };
        const lines = [headers.join(',')];
        for (const row of rows) {
            lines.push(headers.map((h) => escape(row[h])).join(','));
        }
        return lines.join('\n');
    }
    async salesSummaryCsv(query) {
        const { data } = await this.salesSummary(query);
        return this.buildCsv(['period_start', 'transaction_count', 'subtotal', 'discount_total', 'tax_total', 'grand_total'], data);
    }
    async salesByProductCsv(query) {
        const { data } = await this.salesByProduct(query);
        return this.buildCsv(['product_id', 'sku', 'product_name', 'brand_name', 'qty_sold', 'net_sales', 'total_discount'], data);
    }
    async salesByCashierCsv(query) {
        const { data } = await this.salesByCashier(query);
        return this.buildCsv(['cashier_id', 'cashier_name', 'transaction_count', 'total_sales'], data);
    }
    async paymentBreakdownCsv(query) {
        const { data } = await this.paymentBreakdown(query);
        return this.buildCsv(['method', 'transaction_count', 'total_amount'], data);
    }
    async grossProfitCsv(query) {
        const { data } = await this.grossProfit(query);
        return this.buildCsv(['product_id', 'sku', 'product_name', 'qty_sold', 'net_revenue', 'total_cost', 'gross_profit', 'margin_percent'], data);
    }
    async stockOnHandCsv(query) {
        const { data } = await this.stockOnHand(query);
        return this.buildCsv(['id', 'sku', 'name', 'product_type', 'brand', 'on_hand_qty', 'reserved_qty', 'min_stock_alert', 'cost_price', 'selling_price', 'stock_value'], data);
    }
    async returnsSummaryCsv(query) {
        const { byDay } = await this.returnsSummary(query);
        return this.buildCsv(['period_start', 'return_count', 'total_refunded', 'affected_sales'], byDay);
    }
};
exports.ReportsService = ReportsService;
exports.ReportsService = ReportsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ReportsService);
//# sourceMappingURL=reports.service.js.map