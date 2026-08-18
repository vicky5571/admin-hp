import { Response } from 'express';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto, QuoteSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales.query.dto';
import { PricingService } from './pricing.service';
import { ReceiptService } from './receipt.service';
import { SalesService } from './sales.service';
export declare class SalesController {
    private readonly salesService;
    private readonly pricingService;
    private readonly receiptService;
    constructor(salesService: SalesService, pricingService: PricingService, receiptService: ReceiptService);
    quote(dto: QuoteSaleDto): {
        subtotal: number;
        discountTotal: number;
        taxTotal: number;
        grandTotal: number;
    };
    create(dto: CreateSaleDto, user: AuthUser): Promise<{
        paidTotal: string;
        change: string;
        id?: number | undefined;
        invoiceNumber?: string | undefined;
        saleTime?: Date | undefined;
        cashierId?: number | undefined;
        customerId?: number | null | undefined;
        subtotal?: string | undefined;
        discountTotal?: string | undefined;
        taxTotal?: string | undefined;
        grandTotal?: string | undefined;
        status?: import("../../common/enums/sale-status.enum").SaleStatus | undefined;
        notes?: string | null | undefined;
        cashier?: import("../users/entities/user.entity").User | undefined;
        customer?: import("./entities/customer.entity").Customer | null | undefined;
        items?: import("./entities/sale-item.entity").SaleItem[] | undefined;
        payments?: import("./entities/payment.entity").Payment[] | undefined;
        createdAt?: Date | undefined;
    }>;
    findAll(query: ListSalesQueryDto): Promise<{
        data: import("./entities/sale.entity").Sale[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<import("./entities/sale.entity").Sale>;
    receipt(id: number): Promise<{
        invoiceNumber: string;
        saleTime: Date;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        grandTotal: string;
        items: import("./entities/sale-item.entity").SaleItem[];
        payments: import("./entities/payment.entity").Payment[];
    }>;
    receiptPdf(id: number, res: Response): Promise<void>;
    voidSale(id: number, user: AuthUser): Promise<import("./entities/sale.entity").Sale>;
}
