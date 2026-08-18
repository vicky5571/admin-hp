import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Sale } from './entities/sale.entity';

@Injectable()
export class ReceiptService {
  buildReceiptPayload(sale: Sale) {
    return {
      invoiceNumber: sale.invoiceNumber,
      saleTime: sale.saleTime,
      subtotal: sale.subtotal,
      discountTotal: sale.discountTotal,
      taxTotal: sale.taxTotal,
      grandTotal: sale.grandTotal,
      items: sale.items,
      payments: sale.payments,
    };
  }

  generatePdf(sale: Sale): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [226, 800],
        margins: { top: 10, bottom: 10, left: 12, right: 12 },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const line = () => doc.moveDown(0.3).text('─'.repeat(30), { align: 'center' }).moveDown(0.3);
      const right = (label: string, value: string) => {
        doc.text(`${label}${value}`, { align: 'right' });
      };

      doc.fontSize(12).font('Helvetica-Bold').text('SmartStore', { align: 'center' });
      doc.fontSize(7).font('Helvetica').text('POS & Inventory', { align: 'center' });
      doc.moveDown(0.5);

      doc.fontSize(8).font('Helvetica-Bold').text(`Invoice: ${sale.invoiceNumber}`);
      doc.fontSize(7).font('Helvetica').text(`Date: ${new Date(sale.saleTime).toLocaleString()}`);
      doc.text(`Cashier: ${sale.cashier?.fullName ?? '-'}`);
      if (sale.customer) {
        doc.text(`Customer: ${sale.customer.name ?? '-'}`);
      }
      line();

      for (const item of sale.items) {
        doc.fontSize(7).font('Helvetica-Bold').text(item.product?.name ?? `Product #${item.productId}`);
        doc.font('Helvetica').text(
          `  ${item.qty} x IDR ${parseFloat(item.unitPrice).toLocaleString()}   IDR ${parseFloat(item.lineTotal).toLocaleString()}`,
        );
        if (item.imeis && item.imeis.length > 0) {
          for (const link of item.imeis) {
            doc.fontSize(6).text(`    IMEI: ${link.imeiUnit?.imei ?? link.imeiUnitId}`);
          }
        }
      }
      line();

      doc.fontSize(7).font('Helvetica');
      right('Subtotal:  IDR ', parseFloat(sale.subtotal).toLocaleString());
      if (parseFloat(sale.discountTotal) > 0) {
        right('Discount:  -IDR ', parseFloat(sale.discountTotal).toLocaleString());
      }
      if (parseFloat(sale.taxTotal) > 0) {
        right('Tax:  IDR ', parseFloat(sale.taxTotal).toLocaleString());
      }
      doc.fontSize(8).font('Helvetica-Bold');
      right('TOTAL:  IDR ', parseFloat(sale.grandTotal).toLocaleString());

      line();

      doc.fontSize(7).font('Helvetica');
      for (const pay of sale.payments) {
        right(`${pay.method}:  IDR `, parseFloat(String(pay.amount)).toLocaleString());
      }

      doc.moveDown(1);
      doc.fontSize(7).font('Helvetica').text('Thank you for your purchase!', { align: 'center' });

      doc.end();
    });
  }
}
