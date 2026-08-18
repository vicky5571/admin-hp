import { Sale } from './entities/sale.entity';
export declare class ReceiptService {
    buildReceiptPayload(sale: Sale): {
        invoiceNumber: string;
        saleTime: Date;
        subtotal: string;
        discountTotal: string;
        taxTotal: string;
        grandTotal: string;
        items: import("./entities/sale-item.entity").SaleItem[];
        payments: import("./entities/payment.entity").Payment[];
    };
    generatePdf(sale: Sale): Promise<Buffer>;
}
