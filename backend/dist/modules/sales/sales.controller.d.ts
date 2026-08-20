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
        items: {
            productId: number;
            qty: number;
            unitPrice: number;
            discountAmount: number;
            taxAmount: number;
            lineTotal: number;
        }[];
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
        id: number;
        invoiceNumber: string;
        saleTime: Date;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        grandTotal: string;
        notes: string | null;
        cashier: {
            id: number;
            fullName: string;
        } | null;
        customer: {
            id: number;
            name: string;
            phone: string | null;
            email: string | null;
        } | null;
        items: {
            id: number;
            productId: number;
            productName: string;
            sku: string;
            productType: import("../../common/enums/product-type.enum").ProductType;
            qty: number;
            unitPrice: string;
            discountAmount: string;
            lineTotal: string;
            imeis: {
                id: number;
                imeiUnitId: number;
                imei: string;
                conditionGrade: string | null;
                batteryHealth: number | null;
            }[];
        }[];
        payments: {
            id: number;
            method: import("../../common/enums/payment-method.enum").PaymentMethod;
            amount: string;
            referenceNumber: string | null;
        }[];
        warrantyPolicy: {
            secondHandDays: number;
            newWarranty: string;
            conditions: string[];
        };
    }>;
    receiptPdf(id: number, res: Response): Promise<void>;
    voidSale(id: number, user: AuthUser): Promise<import("./entities/sale.entity").Sale>;
}
