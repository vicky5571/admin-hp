"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedDemoData = seedDemoData;
const imei_status_enum_1 = require("../../common/enums/imei-status.enum");
const movement_type_enum_1 = require("../../common/enums/movement-type.enum");
const payment_method_enum_1 = require("../../common/enums/payment-method.enum");
const product_type_enum_1 = require("../../common/enums/product-type.enum");
const refund_method_enum_1 = require("../../common/enums/refund-method.enum");
const restock_type_enum_1 = require("../../common/enums/restock-type.enum");
const return_status_enum_1 = require("../../common/enums/return-status.enum");
const sale_status_enum_1 = require("../../common/enums/sale-status.enum");
const brand_entity_1 = require("../../modules/catalog/entities/brand.entity");
const category_entity_1 = require("../../modules/catalog/entities/category.entity");
const product_entity_1 = require("../../modules/catalog/entities/product.entity");
const tax_class_entity_1 = require("../../modules/catalog/entities/tax-class.entity");
const stock_balance_entity_1 = require("../../modules/inventory/entities/stock-balance.entity");
const stock_movement_entity_1 = require("../../modules/inventory/entities/stock-movement.entity");
const imei_unit_entity_1 = require("../../modules/imei/entities/imei-unit.entity");
const customer_entity_1 = require("../../modules/sales/entities/customer.entity");
const payment_entity_1 = require("../../modules/sales/entities/payment.entity");
const return_item_entity_1 = require("../../modules/sales/entities/return-item.entity");
const return_entity_1 = require("../../modules/sales/entities/return.entity");
const sale_item_imei_entity_1 = require("../../modules/sales/entities/sale-item-imei.entity");
const sale_item_entity_1 = require("../../modules/sales/entities/sale-item.entity");
const sale_entity_1 = require("../../modules/sales/entities/sale.entity");
const user_entity_1 = require("../../modules/users/entities/user.entity");
function ymd(date) {
    return (date.getFullYear().toString() +
        (date.getMonth() + 1).toString().padStart(2, '0') +
        date.getDate().toString().padStart(2, '0'));
}
function daysAgo(n, hour = 10) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    d.setHours(hour, 30, 0, 0);
    return d;
}
const PRODUCT_SPECS = [
    {
        sku: 'IP15-128-BLK',
        name: 'iPhone 15 128GB Black',
        category: 'Smartphones',
        brand: 'Apple',
        productType: product_type_enum_1.ProductType.SERIALIZED,
        costPrice: '11000000.00',
        srp: '13500000.00',
        taxClass: 'VAT11_EXCLUSIVE',
        minStockAlert: 2,
        stock: 5,
        imeiCount: 5,
    },
    {
        sku: 'IP15-256-BLU',
        name: 'iPhone 15 256GB Blue',
        category: 'Smartphones',
        brand: 'Apple',
        productType: product_type_enum_1.ProductType.SERIALIZED,
        costPrice: '13000000.00',
        srp: '15999000.00',
        taxClass: 'VAT11_EXCLUSIVE',
        minStockAlert: 2,
        stock: 3,
        imeiCount: 3,
    },
    {
        sku: 'S24-256-BLK',
        name: 'Samsung Galaxy S24 256GB Black',
        category: 'Smartphones',
        brand: 'Samsung',
        productType: product_type_enum_1.ProductType.SERIALIZED,
        costPrice: '12500000.00',
        srp: '14999000.00',
        taxClass: 'VAT11_EXCLUSIVE',
        minStockAlert: 2,
        stock: 4,
        imeiCount: 4,
    },
    {
        sku: 'RN13-128',
        name: 'Xiaomi Redmi Note 13 128GB',
        category: 'Smartphones',
        brand: 'Xiaomi',
        productType: product_type_enum_1.ProductType.SERIALIZED,
        costPrice: '2300000.00',
        srp: '2799000.00',
        taxClass: 'VAT11_EXCLUSIVE',
        minStockAlert: 3,
        stock: 8,
        imeiCount: 8,
    },
    {
        sku: 'ANKER-65W',
        name: 'Anker 65W USB-C Charger',
        category: 'Accessories',
        brand: 'Anker',
        productType: product_type_enum_1.ProductType.NON_SERIALIZED,
        costPrice: '350000.00',
        srp: '499000.00',
        taxClass: 'NON_TAX',
        minStockAlert: 5,
        stock: 25,
        imeiCount: 0,
    },
    {
        sku: 'BASEUS-CBL-C',
        name: 'Baseus USB-C Cable 100W 1m',
        category: 'Accessories',
        brand: 'Baseus',
        productType: product_type_enum_1.ProductType.NON_SERIALIZED,
        costPrice: '45000.00',
        srp: '89000.00',
        taxClass: 'NON_TAX',
        minStockAlert: 10,
        stock: 50,
        imeiCount: 0,
    },
    {
        sku: 'SS-GLASS',
        name: 'Tempered Glass Screen Protector',
        category: 'Accessories',
        brand: null,
        productType: product_type_enum_1.ProductType.NON_SERIALIZED,
        costPrice: '15000.00',
        srp: '50000.00',
        taxClass: 'NON_TAX',
        minStockAlert: 10,
        stock: 40,
        imeiCount: 0,
    },
    {
        sku: 'SVC-INSTALL',
        name: 'Screen Protector Installation',
        category: 'Services',
        brand: null,
        productType: product_type_enum_1.ProductType.SERVICE,
        costPrice: '0.00',
        srp: '25000.00',
        taxClass: 'NON_TAX',
        minStockAlert: 0,
        stock: 0,
        imeiCount: 0,
    },
];
const SALE_SPECS = [
    {
        daysAgo: 6,
        hour: 10,
        customer: 'Budi Santoso',
        lines: [{ sku: 'IP15-128-BLK', qty: 1 }],
        method: payment_method_enum_1.PaymentMethod.CASH,
    },
    {
        daysAgo: 5,
        hour: 13,
        customer: null,
        lines: [
            { sku: 'ANKER-65W', qty: 2 },
            { sku: 'BASEUS-CBL-C', qty: 1 },
        ],
        method: payment_method_enum_1.PaymentMethod.E_WALLET,
    },
    {
        daysAgo: 4,
        hour: 11,
        customer: 'Siti Rahma',
        lines: [{ sku: 'S24-256-BLK', qty: 1 }],
        method: payment_method_enum_1.PaymentMethod.BANK_TRANSFER,
    },
    {
        daysAgo: 3,
        hour: 15,
        customer: null,
        lines: [
            { sku: 'SS-GLASS', qty: 3 },
            { sku: 'SVC-INSTALL', qty: 3 },
        ],
        method: payment_method_enum_1.PaymentMethod.CASH,
    },
    {
        daysAgo: 2,
        hour: 12,
        customer: 'Budi Santoso',
        lines: [
            { sku: 'RN13-128', qty: 1 },
            { sku: 'BASEUS-CBL-C', qty: 1 },
        ],
        method: payment_method_enum_1.PaymentMethod.CASH,
    },
    {
        daysAgo: 1,
        hour: 10,
        customer: null,
        lines: [{ sku: 'IP15-256-BLU', qty: 1 }],
        method: payment_method_enum_1.PaymentMethod.BANK_TRANSFER,
    },
    {
        daysAgo: 1,
        hour: 16,
        customer: 'Siti Rahma',
        lines: [
            { sku: 'ANKER-65W', qty: 1 },
            { sku: 'SS-GLASS', qty: 2 },
        ],
        method: payment_method_enum_1.PaymentMethod.E_WALLET,
    },
    {
        daysAgo: 0,
        hour: 9,
        customer: null,
        lines: [
            { sku: 'RN13-128', qty: 1 },
            { sku: 'SVC-INSTALL', qty: 1 },
        ],
        method: payment_method_enum_1.PaymentMethod.CASH,
    },
];
async function seedDemoData(dataSource) {
    const productRepo = dataSource.getRepository(product_entity_1.Product);
    const exists = await productRepo.findOneBy({ sku: 'IP15-128-BLK' });
    if (exists) {
        console.log('[seed] demo data already exists — skipped');
        return;
    }
    const owner = await dataSource
        .getRepository(user_entity_1.User)
        .findOne({ where: { username: 'owner' } });
    if (!owner) {
        throw new Error('User "owner" not found. Run admin user seeder first.');
    }
    const ownerId = Number(owner.id);
    const categoryRepo = dataSource.getRepository(category_entity_1.Category);
    const brandRepo = dataSource.getRepository(brand_entity_1.Brand);
    const taxRepo = dataSource.getRepository(tax_class_entity_1.TaxClass);
    const categoryIds = new Map();
    for (const name of ['Smartphones', 'Accessories', 'Services']) {
        let row = await categoryRepo.findOneBy({ name });
        if (!row)
            row = await categoryRepo.save(categoryRepo.create({ name }));
        categoryIds.set(name, Number(row.id));
    }
    const brandIds = new Map();
    for (const name of ['Apple', 'Samsung', 'Xiaomi', 'Anker', 'Baseus']) {
        let row = await brandRepo.findOneBy({ name });
        if (!row)
            row = await brandRepo.save(brandRepo.create({ name }));
        brandIds.set(name, Number(row.id));
    }
    const taxIds = new Map();
    for (const name of ['VAT11_EXCLUSIVE', 'NON_TAX']) {
        const row = await taxRepo.findOneBy({ name });
        if (row)
            taxIds.set(name, Number(row.id));
    }
    const products = new Map();
    const stockRepo = dataSource.getRepository(stock_balance_entity_1.StockBalance);
    const movementRepo = dataSource.getRepository(stock_movement_entity_1.StockMovement);
    const imeiRepo = dataSource.getRepository(imei_unit_entity_1.ImeiUnit);
    const seedTime = daysAgo(7, 8);
    let imeiSeq = 1;
    for (const spec of PRODUCT_SPECS) {
        const product = await productRepo.save(productRepo.create({
            sku: spec.sku,
            name: spec.name,
            categoryId: spec.category ? categoryIds.get(spec.category) ?? null : null,
            brandId: spec.brand ? brandIds.get(spec.brand) ?? null : null,
            productType: spec.productType,
            costPrice: spec.costPrice,
            srp: spec.srp,
            taxClassId: spec.taxClass ? taxIds.get(spec.taxClass) ?? null : null,
            minStockAlert: spec.minStockAlert,
            isActive: true,
        }));
        products.set(spec.sku, product);
        const productId = Number(product.id);
        if (spec.stock > 0) {
            await stockRepo.save(stockRepo.create({ productId, onHandQty: spec.stock, reservedQty: 0 }));
            await movementRepo.save(movementRepo.create({
                productId,
                movementType: movement_type_enum_1.MovementType.IN,
                qty: spec.stock,
                unitCost: spec.costPrice,
                refType: 'SEED',
                refId: 0,
                createdBy: ownerId,
                notes: 'Initial demo stock',
                imeiUnitId: null,
                movementTime: seedTime,
            }));
        }
        for (let i = 0; i < spec.imeiCount; i++) {
            const imei = `35693810${String(imeiSeq++).padStart(7, '0')}`;
            const sampleGrades = ['Grade A', 'Grade A', 'Brand New', 'Grade B'];
            const sampleBH = [100, 98, 92, 88];
            await imeiRepo.save(imeiRepo.create({
                imei,
                productId,
                status: imei_status_enum_1.ImeiStatus.IN_STOCK,
                currentLocation: 'STORE',
                conditionGrade: sampleGrades[i % sampleGrades.length],
                batteryHealth: sampleBH[i % sampleBH.length],
            }));
        }
    }
    const customerRepo = dataSource.getRepository(customer_entity_1.Customer);
    const customerIds = new Map();
    for (const c of [
        { name: 'Budi Santoso', phone: '081234567890', email: 'budi@example.com' },
        { name: 'Siti Rahma', phone: '081298765432', email: 'siti@example.com' },
    ]) {
        let row = await customerRepo.findOne({ where: { name: c.name } });
        if (!row)
            row = await customerRepo.save(customerRepo.create(c));
        customerIds.set(c.name, Number(row.id));
    }
    const saleRepo = dataSource.getRepository(sale_entity_1.Sale);
    const saleItemRepo = dataSource.getRepository(sale_item_entity_1.SaleItem);
    const saleItemImeiRepo = dataSource.getRepository(sale_item_imei_entity_1.SaleItemImei);
    const paymentRepo = dataSource.getRepository(payment_entity_1.Payment);
    const invoiceSeqByDay = new Map();
    const savedSales = [];
    for (const spec of SALE_SPECS) {
        const saleTime = daysAgo(spec.daysAgo, spec.hour);
        const dayKey = ymd(saleTime);
        const seq = (invoiceSeqByDay.get(dayKey) ?? 0) + 1;
        invoiceSeqByDay.set(dayKey, seq);
        const invoiceNumber = `INV-${dayKey}-${String(seq).padStart(4, '0')}`;
        let subtotal = 0;
        const lines = [];
        for (const line of spec.lines) {
            const product = products.get(line.sku);
            if (!product)
                throw new Error(`Unknown SKU ${line.sku}`);
            const unitPrice = parseFloat(product.srp);
            const lineTotal = unitPrice * line.qty;
            subtotal += lineTotal;
            lines.push({ product, qty: line.qty, lineTotal });
        }
        const sale = await saleRepo.save(saleRepo.create({
            invoiceNumber,
            saleTime,
            cashierId: ownerId,
            customerId: spec.customer ? customerIds.get(spec.customer) ?? null : null,
            subtotal: subtotal.toFixed(2),
            discountTotal: '0.00',
            taxTotal: '0.00',
            grandTotal: subtotal.toFixed(2),
            status: sale_status_enum_1.SaleStatus.COMPLETED,
            notes: null,
        }));
        const saleId = Number(sale.id);
        const savedItems = [];
        for (const line of lines) {
            const productId = Number(line.product.id);
            const unitPrice = parseFloat(line.product.srp);
            const item = await saleItemRepo.save(saleItemRepo.create({
                saleId,
                productId,
                qty: line.qty,
                unitPrice: unitPrice.toFixed(2),
                discountAmount: '0.00',
                taxAmount: '0.00',
                lineTotal: line.lineTotal.toFixed(2),
            }));
            savedItems.push(item);
            if (line.product.productType !== product_type_enum_1.ProductType.SERVICE) {
                const balance = await stockRepo.findOne({ where: { productId } });
                if (!balance || balance.onHandQty < line.qty) {
                    throw new Error(`Not enough seeded stock for ${line.product.sku}`);
                }
                balance.onHandQty -= line.qty;
                await stockRepo.save(balance);
                await movementRepo.save(movementRepo.create({
                    productId,
                    movementType: movement_type_enum_1.MovementType.OUT,
                    qty: line.qty,
                    unitCost: line.product.costPrice,
                    refType: 'SALE',
                    refId: saleId,
                    createdBy: ownerId,
                    notes: null,
                    imeiUnitId: null,
                    movementTime: saleTime,
                }));
            }
            if (line.product.productType === product_type_enum_1.ProductType.SERIALIZED) {
                const imeis = await imeiRepo.find({
                    where: { productId, status: imei_status_enum_1.ImeiStatus.IN_STOCK },
                    take: line.qty,
                });
                if (imeis.length < line.qty) {
                    throw new Error(`Not enough IMEIs for ${line.product.sku}`);
                }
                for (const imei of imeis) {
                    imei.status = imei_status_enum_1.ImeiStatus.SOLD;
                    imei.lastRefType = 'SALE';
                    imei.lastRefId = saleId;
                    await imeiRepo.save(imei);
                    await saleItemImeiRepo.save(saleItemImeiRepo.create({
                        saleItemId: Number(item.id),
                        imeiUnitId: Number(imei.id),
                    }));
                }
            }
        }
        await paymentRepo.save(paymentRepo.create({
            saleId,
            method: spec.method,
            amount: subtotal.toFixed(2),
            referenceNo: null,
        }));
        savedSales.push({ sale, items: savedItems, spec });
    }
    const returnTarget = savedSales.find((s) => s.spec.lines.some((l) => l.sku === 'BASEUS-CBL-C'));
    if (returnTarget) {
        const returnItemSpec = returnTarget.spec.lines.find((l) => l.sku === 'BASEUS-CBL-C');
        const saleItem = returnTarget.items[returnTarget.spec.lines.indexOf(returnItemSpec)];
        const product = products.get(returnItemSpec.sku);
        const productId = Number(product.id);
        const unitRefund = parseFloat(product.srp);
        const returnTime = daysAgo(1, 18);
        const returnNumber = `RET-${ymd(returnTime)}-0001`;
        const returnRepo = dataSource.getRepository(return_entity_1.Return);
        const returnItemRepo = dataSource.getRepository(return_item_entity_1.ReturnItem);
        const ret = await returnRepo.save(returnRepo.create({
            returnNumber,
            saleId: Number(returnTarget.sale.id),
            processedBy: ownerId,
            returnTime,
            refundTotal: unitRefund.toFixed(2),
            refundMethod: refund_method_enum_1.RefundMethod.CASH,
            status: return_status_enum_1.ReturnStatus.COMPLETED,
            reason: 'Customer changed mind',
        }));
        await returnItemRepo.save(returnItemRepo.create({
            returnId: Number(ret.id),
            saleItemId: Number(saleItem.id),
            productId,
            qty: 1,
            unitRefund: unitRefund.toFixed(2),
            lineRefundTotal: unitRefund.toFixed(2),
            restockType: restock_type_enum_1.RestockType.SELLABLE,
        }));
        const balance = await stockRepo.findOne({ where: { productId } });
        if (balance) {
            balance.onHandQty += 1;
            await stockRepo.save(balance);
        }
        await movementRepo.save(movementRepo.create({
            productId,
            movementType: movement_type_enum_1.MovementType.RETURN_IN,
            qty: 1,
            unitCost: product.costPrice,
            refType: 'RETURN',
            refId: Number(ret.id),
            createdBy: ownerId,
            notes: `Return via ${returnNumber}`,
            imeiUnitId: null,
            movementTime: returnTime,
        }));
    }
    console.log(`[seed] demo data created: ${PRODUCT_SPECS.length} products, ${SALE_SPECS.length} sales, 1 return`);
}
//# sourceMappingURL=seed.demo-data.js.map