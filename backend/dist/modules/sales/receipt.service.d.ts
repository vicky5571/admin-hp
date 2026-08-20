import { Sale } from './entities/sale.entity';
export declare class ReceiptService {
    buildReceiptPayload(sale: Sale): {
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
    };
    generatePdf(sale: Sale): Promise<Buffer>;
}
