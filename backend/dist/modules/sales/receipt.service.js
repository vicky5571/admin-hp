"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReceiptService = void 0;
const common_1 = require("@nestjs/common");
const pdfkit_1 = __importDefault(require("pdfkit"));
let ReceiptService = class ReceiptService {
    buildReceiptPayload(sale) {
        return {
            id: sale.id,
            invoiceNumber: sale.invoiceNumber,
            saleTime: sale.saleTime,
            subtotal: sale.subtotal,
            discountTotal: sale.discountTotal,
            taxTotal: sale.taxTotal,
            grandTotal: sale.grandTotal,
            notes: sale.notes,
            cashier: sale.cashier
                ? { id: sale.cashier.id, fullName: sale.cashier.fullName }
                : null,
            customer: sale.customer
                ? {
                    id: sale.customer.id,
                    name: sale.customer.name,
                    phone: sale.customer.phone,
                    email: sale.customer.email,
                }
                : null,
            items: sale.items?.map((item) => ({
                id: item.id,
                productId: item.productId,
                productName: item.product?.name ?? `Product #${item.productId}`,
                sku: item.product?.sku ?? '',
                productType: item.product?.productType ?? 'STANDARD',
                qty: item.qty,
                unitPrice: item.unitPrice,
                discountAmount: item.discountAmount,
                lineTotal: item.lineTotal,
                imeis: item.imeis?.map((sii) => ({
                    id: sii.id,
                    imeiUnitId: sii.imeiUnitId,
                    imei: sii.imeiUnit?.imei ?? String(sii.imeiUnitId),
                    conditionGrade: sii.imeiUnit?.conditionGrade ?? null,
                    batteryHealth: sii.imeiUnit?.batteryHealth ?? null,
                })),
            })),
            payments: sale.payments?.map((p) => ({
                id: p.id,
                method: p.method,
                amount: p.amount,
                referenceNumber: p.referenceNo ?? null,
            })),
            warrantyPolicy: {
                secondHandDays: 7,
                newWarranty: '1-Year Official Brand Warranty',
                conditions: [
                    'Garansi Toko 7 Hari untuk Unit Second (Fungsional & Mesin).',
                    'Garansi Resmi Distributor/Brand untuk Unit Baru (Brand New).',
                    'Segel toko wajib utuh, tidak rusak/robek.',
                    'Tidak berlaku akibat kelalaian pemakai (terjatuh, terkena cairan, modifikasi OS/root).',
                    'Wajib membawa struk/nota ini untuk proses klaim garansi.',
                ],
            },
        };
    }
    generatePdf(sale) {
        return new Promise((resolve, reject) => {
            const itemCount = sale.items?.length || 1;
            let totalImeis = 0;
            for (const it of sale.items || []) {
                if (it.imeis)
                    totalImeis += it.imeis.length;
            }
            const calculatedHeight = Math.max(520, 320 + itemCount * 35 + totalImeis * 16 + 140);
            const doc = new pdfkit_1.default({
                size: [226, calculatedHeight],
                margins: { top: 12, bottom: 12, left: 10, right: 10 },
            });
            const chunks = [];
            doc.on('data', (chunk) => chunks.push(chunk));
            doc.on('end', () => resolve(Buffer.concat(chunks)));
            doc.on('error', reject);
            const line = () => doc
                .moveDown(0.2)
                .font('Helvetica')
                .fontSize(6)
                .text('─'.repeat(38), { align: 'center' })
                .moveDown(0.2);
            const right = (label, value) => {
                doc.text(`${label}${value}`, { align: 'right' });
            };
            doc
                .fontSize(12)
                .font('Helvetica-Bold')
                .text('SmartStore', { align: 'center' });
            doc
                .fontSize(7)
                .font('Helvetica')
                .text('Smartphone & Gadget Store', { align: 'center' });
            doc.moveDown(0.4);
            doc.fontSize(7.5).font('Helvetica-Bold').text(`Invoice : ${sale.invoiceNumber}`);
            doc
                .fontSize(6.5)
                .font('Helvetica')
                .text(`Date    : ${new Date(sale.saleTime).toLocaleString('id-ID')}`);
            doc.text(`Cashier : ${sale.cashier?.fullName ?? '-'}`);
            if (sale.customer) {
                doc.text(`Customer: ${sale.customer.name}${sale.customer.phone ? ` (${sale.customer.phone})` : ''}`);
            }
            line();
            for (const item of sale.items || []) {
                const prodName = item.product?.name ?? `Product #${item.productId}`;
                doc.fontSize(7).font('Helvetica-Bold').text(prodName);
                const qtyPrice = `  ${item.qty} x IDR ${parseFloat(item.unitPrice).toLocaleString('id-ID')}`;
                const totalStr = `IDR ${parseFloat(item.lineTotal).toLocaleString('id-ID')}`;
                doc.fontSize(6.5).font('Helvetica');
                const startY = doc.y;
                doc.text(qtyPrice, { continued: false });
                doc.text(totalStr, { align: 'right' });
                if (item.imeis && item.imeis.length > 0) {
                    for (const link of item.imeis) {
                        const imeiNum = link.imeiUnit?.imei ?? String(link.imeiUnitId);
                        const tags = [];
                        if (link.imeiUnit?.conditionGrade) {
                            tags.push(`Grade: ${link.imeiUnit.conditionGrade}`);
                        }
                        if (link.imeiUnit?.batteryHealth != null) {
                            tags.push(`BH: ${link.imeiUnit.batteryHealth}%`);
                        }
                        const tagStr = tags.length > 0 ? ` [${tags.join(' • ')}]` : '';
                        doc
                            .fontSize(6)
                            .font('Helvetica-Oblique')
                            .text(`    IMEI: ${imeiNum}${tagStr}`);
                    }
                }
                doc.moveDown(0.2);
            }
            line();
            doc.fontSize(6.5).font('Helvetica');
            right('Subtotal:  IDR ', parseFloat(sale.subtotal).toLocaleString('id-ID'));
            if (parseFloat(sale.discountTotal) > 0) {
                right('Discount: -IDR ', parseFloat(sale.discountTotal).toLocaleString('id-ID'));
            }
            if (parseFloat(sale.taxTotal) > 0) {
                right('Tax:  IDR ', parseFloat(sale.taxTotal).toLocaleString('id-ID'));
            }
            doc.fontSize(7.5).font('Helvetica-Bold');
            right('TOTAL:  IDR ', parseFloat(sale.grandTotal).toLocaleString('id-ID'));
            line();
            doc.fontSize(6.5).font('Helvetica');
            for (const pay of sale.payments || []) {
                right(`Payment (${pay.method}):  IDR `, parseFloat(String(pay.amount)).toLocaleString('id-ID'));
            }
            line();
            doc
                .fontSize(6.5)
                .font('Helvetica-Bold')
                .text('KETENTUAN GARANSI / WARRANTY TERMS', { align: 'center' });
            doc.moveDown(0.2);
            doc.fontSize(5.5).font('Helvetica');
            doc.text('• Unit Second: Garansi Toko 7 Hari (Fungsional & Hardware).');
            doc.text('• Unit Baru (Brand New): Garansi Resmi Distributor/Brand.');
            doc.text('• Segel toko wajib utuh & tidak rusak/robek.');
            doc.text('• Tidak berlaku akibat jatuh, kena air, atau human error.');
            doc.text('• Wajib simpan struk ini sebagai bukti garansi yang sah.');
            doc.moveDown(0.4);
            doc
                .fontSize(6.5)
                .font('Helvetica-Bold')
                .text('Terima Kasih Atas Kunjungan Anda!', { align: 'center' });
            doc.end();
        });
    }
};
exports.ReceiptService = ReceiptService;
exports.ReceiptService = ReceiptService = __decorate([
    (0, common_1.Injectable)()
], ReceiptService);
//# sourceMappingURL=receipt.service.js.map