import { DataSource } from 'typeorm';
import { ImeiStatus } from '../../common/enums/imei-status.enum';
import { MovementType } from '../../common/enums/movement-type.enum';
import { PaymentMethod } from '../../common/enums/payment-method.enum';
import { ProductType } from '../../common/enums/product-type.enum';
import { RefundMethod } from '../../common/enums/refund-method.enum';
import { RestockType } from '../../common/enums/restock-type.enum';
import { ReturnStatus } from '../../common/enums/return-status.enum';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { Brand } from '../../modules/catalog/entities/brand.entity';
import { Category } from '../../modules/catalog/entities/category.entity';
import { Product } from '../../modules/catalog/entities/product.entity';
import { TaxClass } from '../../modules/catalog/entities/tax-class.entity';
import { StockBalance } from '../../modules/inventory/entities/stock-balance.entity';
import { StockMovement } from '../../modules/inventory/entities/stock-movement.entity';
import { ImeiUnit } from '../../modules/imei/entities/imei-unit.entity';
import { Customer } from '../../modules/sales/entities/customer.entity';
import { Payment } from '../../modules/sales/entities/payment.entity';
import { ReturnItem } from '../../modules/sales/entities/return-item.entity';
import { Return } from '../../modules/sales/entities/return.entity';
import { SaleItemImei } from '../../modules/sales/entities/sale-item-imei.entity';
import { SaleItem } from '../../modules/sales/entities/sale-item.entity';
import { Sale } from '../../modules/sales/entities/sale.entity';
import { User } from '../../modules/users/entities/user.entity';

function ymd(date: Date): string {
  return (
    date.getFullYear().toString() +
    (date.getMonth() + 1).toString().padStart(2, '0') +
    date.getDate().toString().padStart(2, '0')
  );
}

function daysAgo(n: number, hour = 10): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 30, 0, 0);
  return d;
}

interface UnitSampleSpec {
  grade: string;
  battery: number;
  cost: string;
  srp: string;
  location: string;
}

interface ProductSpec {
  sku: string;
  name: string;
  category: string;
  brand: string | null;
  productType: ProductType;
  costPrice: string; // 0 for serialized, standard cost for non-serialized
  srp: string;       // 0 for serialized, standard srp for non-serialized
  taxClass: string | null;
  minStockAlert: number;
  stock: number;
  imeiUnits?: UnitSampleSpec[];
}

const PRODUCT_SPECS: ProductSpec[] = [
  {
    sku: 'IP15-128-BLK',
    name: 'iPhone 15 128GB Black (Second)',
    category: 'Smartphones',
    brand: 'Apple',
    productType: ProductType.SERIALIZED,
    costPrice: '0.00',
    srp: '0.00',
    taxClass: 'VAT11_EXCLUSIVE',
    minStockAlert: 2,
    stock: 5,
    imeiUnits: [
      { grade: 'Like New', battery: 100, cost: '11500000.00', srp: '13800000.00', location: 'STORE' },
      { grade: 'Grade A', battery: 96, cost: '10800000.00', srp: '13200000.00', location: 'DISPLAY' },
      { grade: 'Grade A', battery: 94, cost: '10500000.00', srp: '12900000.00', location: 'STORE' },
      { grade: 'Grade B', battery: 86, cost: '9800000.00', srp: '11900000.00', location: 'WAREHOUSE' },
      { grade: 'Brand New', battery: 100, cost: '12200000.00', srp: '14500000.00', location: 'STORE' },
    ],
  },
  {
    sku: 'IP13-128-BLU',
    name: 'iPhone 13 128GB Blue (Second)',
    category: 'Smartphones',
    brand: 'Apple',
    productType: ProductType.SERIALIZED,
    costPrice: '0.00',
    srp: '0.00',
    taxClass: 'VAT11_EXCLUSIVE',
    minStockAlert: 2,
    stock: 4,
    imeiUnits: [
      { grade: 'Like New', battery: 98, cost: '7800000.00', srp: '9200000.00', location: 'STORE' },
      { grade: 'Grade A', battery: 91, cost: '7200000.00', srp: '8600000.00', location: 'STORE' },
      { grade: 'Grade B', battery: 84, cost: '6500000.00', srp: '7800000.00', location: 'WAREHOUSE' },
      { grade: 'Grade B', battery: 82, cost: '6300000.00', srp: '7600000.00', location: 'STORE' },
    ],
  },
  {
    sku: 'S24-256-BLK',
    name: 'Samsung Galaxy S24 256GB Black (Second)',
    category: 'Smartphones',
    brand: 'Samsung',
    productType: ProductType.SERIALIZED,
    costPrice: '0.00',
    srp: '0.00',
    taxClass: 'VAT11_EXCLUSIVE',
    minStockAlert: 2,
    stock: 4,
    imeiUnits: [
      { grade: 'Like New', battery: 100, cost: '12500000.00', srp: '14800000.00', location: 'DISPLAY' },
      { grade: 'Grade A', battery: 97, cost: '11800000.00', srp: '13900000.00', location: 'STORE' },
      { grade: 'Grade A', battery: 95, cost: '11500000.00', srp: '13600000.00', location: 'WAREHOUSE' },
      { grade: 'Grade B', battery: 88, cost: '10500000.00', srp: '12400000.00', location: 'STORE' },
    ],
  },
  {
    sku: 'RN13-128',
    name: 'Xiaomi Redmi Note 13 128GB (New)',
    category: 'Smartphones',
    brand: 'Xiaomi',
    productType: ProductType.SERIALIZED,
    costPrice: '0.00',
    srp: '0.00',
    taxClass: 'VAT11_EXCLUSIVE',
    minStockAlert: 3,
    stock: 8,
    imeiUnits: [
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'STORE' },
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'STORE' },
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'STORE' },
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'WAREHOUSE' },
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'WAREHOUSE' },
      { grade: 'Brand New', battery: 100, cost: '2250000.00', srp: '2699000.00', location: 'WAREHOUSE' },
      { grade: 'Like New', battery: 99, cost: '2000000.00', srp: '2450000.00', location: 'STORE' },
      { grade: 'Grade A', battery: 93, cost: '1850000.00', srp: '2250000.00', location: 'STORE' },
    ],
  },
  {
    sku: 'ANKER-65W',
    name: 'Anker 65W GaN Fast Charger USB-C',
    category: 'Accessories',
    brand: 'Anker',
    productType: ProductType.NON_SERIALIZED,
    costPrice: '350000.00',
    srp: '499000.00',
    taxClass: 'NON_TAX',
    minStockAlert: 5,
    stock: 25,
  },
  {
    sku: 'BASEUS-CBL-C',
    name: 'Baseus USB-C to USB-C 100W 1m',
    category: 'Accessories',
    brand: 'Baseus',
    productType: ProductType.NON_SERIALIZED,
    costPrice: '45000.00',
    srp: '89000.00',
    taxClass: 'NON_TAX',
    minStockAlert: 10,
    stock: 50,
  },
  {
    sku: 'SS-GLASS',
    name: 'Premium 9D Tempered Glass Shield',
    category: 'Accessories',
    brand: null,
    productType: ProductType.NON_SERIALIZED,
    costPrice: '15000.00',
    srp: '50000.00',
    taxClass: 'NON_TAX',
    minStockAlert: 10,
    stock: 40,
  },
  {
    sku: 'SVC-INSTALL',
    name: 'Hydrogel / Screen Protector Application',
    category: 'Services',
    brand: null,
    productType: ProductType.SERVICE,
    costPrice: '0.00',
    srp: '25000.00',
    taxClass: 'NON_TAX',
    minStockAlert: 0,
    stock: 0,
  },
  {
    sku: 'SVC-BATTERY',
    name: 'Battery Replacement & Testing Service',
    category: 'Services',
    brand: null,
    productType: ProductType.SERVICE,
    costPrice: '0.00',
    srp: '150000.00',
    taxClass: 'NON_TAX',
    minStockAlert: 0,
    stock: 0,
  },
];

interface SaleLineSpec {
  sku: string;
  qty: number;
}

interface SaleSpec {
  daysAgo: number;
  hour: number;
  customer: string | null;
  lines: SaleLineSpec[];
  method: PaymentMethod;
}

const SALE_SPECS: SaleSpec[] = [
  {
    daysAgo: 6,
    hour: 10,
    customer: 'Budi Santoso',
    lines: [{ sku: 'IP15-128-BLK', qty: 1 }],
    method: PaymentMethod.CASH,
  },
  {
    daysAgo: 5,
    hour: 13,
    customer: null,
    lines: [
      { sku: 'ANKER-65W', qty: 2 },
      { sku: 'BASEUS-CBL-C', qty: 1 },
    ],
    method: PaymentMethod.E_WALLET,
  },
  {
    daysAgo: 4,
    hour: 11,
    customer: 'Siti Rahma',
    lines: [{ sku: 'S24-256-BLK', qty: 1 }],
    method: PaymentMethod.BANK_TRANSFER,
  },
  {
    daysAgo: 3,
    hour: 15,
    customer: null,
    lines: [
      { sku: 'SS-GLASS', qty: 3 },
      { sku: 'SVC-INSTALL', qty: 3 },
    ],
    method: PaymentMethod.CASH,
  },
  {
    daysAgo: 2,
    hour: 12,
    customer: 'Budi Santoso',
    lines: [
      { sku: 'RN13-128', qty: 1 },
      { sku: 'BASEUS-CBL-C', qty: 1 },
    ],
    method: PaymentMethod.CASH,
  },
  {
    daysAgo: 1,
    hour: 10,
    customer: null,
    lines: [{ sku: 'IP13-128-BLU', qty: 1 }],
    method: PaymentMethod.BANK_TRANSFER,
  },
  {
    daysAgo: 1,
    hour: 16,
    customer: 'Siti Rahma',
    lines: [
      { sku: 'ANKER-65W', qty: 1 },
      { sku: 'SS-GLASS', qty: 2 },
    ],
    method: PaymentMethod.E_WALLET,
  },
  {
    daysAgo: 0,
    hour: 9,
    customer: null,
    lines: [
      { sku: 'RN13-128', qty: 1 },
      { sku: 'SVC-INSTALL', qty: 1 },
    ],
    method: PaymentMethod.CASH,
  },
];

export async function seedDemoData(dataSource: DataSource): Promise<void> {
  const productRepo = dataSource.getRepository(Product);

  const exists = await productRepo.findOneBy({ sku: 'IP15-128-BLK' });
  if (exists) {
    await dataSource.query(`
      UPDATE products 
      SET cost_price = 0, srp = 0 
      WHERE product_type = 'SERIALIZED';

      UPDATE imei_units iu
      SET 
        cost_price = CASE 
          WHEN iu.cost_price IS NOT NULL THEN iu.cost_price
          WHEN p.name ILIKE '%iPhone 15%' THEN 11200000.00
          WHEN p.name ILIKE '%iPhone 13%' THEN 7400000.00
          WHEN p.name ILIKE '%Samsung%S24%' THEN 11900000.00
          WHEN p.name ILIKE '%Redmi%' THEN 2100000.00
          ELSE 5000000.00
        END,
        selling_price = CASE 
          WHEN iu.selling_price IS NOT NULL THEN iu.selling_price
          WHEN p.name ILIKE '%iPhone 15%' THEN 13500000.00
          WHEN p.name ILIKE '%iPhone 13%' THEN 8800000.00
          WHEN p.name ILIKE '%Samsung%S24%' THEN 14200000.00
          WHEN p.name ILIKE '%Redmi%' THEN 2650000.00
          ELSE 6200000.00
        END
      FROM products p
      WHERE iu.product_id = p.id AND (iu.cost_price IS NULL OR iu.selling_price IS NULL);
    `);
    console.log('[seed] demo data exists — backfilled and updated IMEI unit prices & catalog schema');
    return;
  }

  const owner = await dataSource
    .getRepository(User)
    .findOne({ where: { username: 'owner' } });
  if (!owner) {
    throw new Error('User "owner" not found. Run admin user seeder first.');
  }
  const ownerId = Number(owner.id);

  const categoryRepo = dataSource.getRepository(Category);
  const brandRepo = dataSource.getRepository(Brand);
  const taxRepo = dataSource.getRepository(TaxClass);

  const categoryIds = new Map<string, number>();
  for (const name of ['Smartphones', 'Accessories', 'Services']) {
    let row = await categoryRepo.findOneBy({ name });
    if (!row) row = await categoryRepo.save(categoryRepo.create({ name }));
    categoryIds.set(name, Number(row.id));
  }

  const brandIds = new Map<string, number>();
  for (const name of ['Apple', 'Samsung', 'Xiaomi', 'Anker', 'Baseus']) {
    let row = await brandRepo.findOneBy({ name });
    if (!row) row = await brandRepo.save(brandRepo.create({ name }));
    brandIds.set(name, Number(row.id));
  }

  const taxIds = new Map<string, number>();
  for (const name of ['VAT11_EXCLUSIVE', 'NON_TAX']) {
    const row = await taxRepo.findOneBy({ name });
    if (row) taxIds.set(name, Number(row.id));
  }

  const products = new Map<string, Product>();
  const stockRepo = dataSource.getRepository(StockBalance);
  const movementRepo = dataSource.getRepository(StockMovement);
  const imeiRepo = dataSource.getRepository(ImeiUnit);
  const seedTime = daysAgo(7, 8);
  let imeiSeq = 1;

  for (const spec of PRODUCT_SPECS) {
    const product = await productRepo.save(
      productRepo.create({
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
      }),
    );
    products.set(spec.sku, product);
    const productId = Number(product.id);

    if (spec.stock > 0) {
      await stockRepo.save(
        stockRepo.create({ productId, onHandQty: spec.stock, reservedQty: 0 }),
      );
      await movementRepo.save(
        movementRepo.create({
          productId,
          movementType: MovementType.IN,
          qty: spec.stock,
          unitCost: spec.costPrice,
          refType: 'SEED',
          refId: 0,
          createdBy: ownerId,
          notes: 'Initial demo stock',
          imeiUnitId: null,
          movementTime: seedTime,
        }),
      );
    }

    if (spec.imeiUnits && spec.imeiUnits.length > 0) {
      for (const u of spec.imeiUnits) {
        const imei = `35693810${String(imeiSeq++).padStart(7, '0')}`;
        await imeiRepo.save(
          imeiRepo.create({
            imei,
            productId,
            status: ImeiStatus.IN_STOCK,
            currentLocation: u.location || 'STORE',
            conditionGrade: u.grade,
            batteryHealth: u.battery,
            costPrice: u.cost,
            sellingPrice: u.srp,
          }),
        );
      }
    }
  }

  const customerRepo = dataSource.getRepository(Customer);
  const customerIds = new Map<string, number>();
  for (const c of [
    { name: 'Budi Santoso', phone: '081234567890', email: 'budi@example.com' },
    { name: 'Siti Rahma', phone: '081298765432', email: 'siti@example.com' },
  ]) {
    let row = await customerRepo.findOne({ where: { name: c.name } });
    if (!row) row = await customerRepo.save(customerRepo.create(c));
    customerIds.set(c.name, Number(row.id));
  }

  const saleRepo = dataSource.getRepository(Sale);
  const saleItemRepo = dataSource.getRepository(SaleItem);
  const saleItemImeiRepo = dataSource.getRepository(SaleItemImei);
  const paymentRepo = dataSource.getRepository(Payment);
  const invoiceSeqByDay = new Map<string, number>();
  const savedSales: { sale: Sale; items: SaleItem[]; spec: SaleSpec }[] = [];

  for (const spec of SALE_SPECS) {
    const saleTime = daysAgo(spec.daysAgo, spec.hour);
    const dayKey = ymd(saleTime);
    const seq = (invoiceSeqByDay.get(dayKey) ?? 0) + 1;
    invoiceSeqByDay.set(dayKey, seq);
    const invoiceNumber = `INV-${dayKey}-${String(seq).padStart(4, '0')}`;

    let subtotal = 0;
    const lines: {
      product: Product;
      qty: number;
      unitPrice: number;
      lineTotal: number;
      assignedImeis?: ImeiUnit[];
    }[] = [];

    for (const line of spec.lines) {
      const product = products.get(line.sku);
      if (!product) throw new Error(`Unknown SKU ${line.sku}`);

      let unitPrice = parseFloat(product.srp || '0');
      let assignedImeis: ImeiUnit[] = [];

      if (product.productType === ProductType.SERIALIZED) {
        assignedImeis = await imeiRepo.find({
          where: { productId: product.id, status: ImeiStatus.IN_STOCK },
          take: line.qty,
        });

        if (assignedImeis.length > 0 && assignedImeis[0].sellingPrice) {
          unitPrice = parseFloat(assignedImeis[0].sellingPrice);
        }
      }

      const lineTotal = unitPrice * line.qty;
      subtotal += lineTotal;
      lines.push({ product, qty: line.qty, unitPrice, lineTotal, assignedImeis });
    }

    const sale = await saleRepo.save(
      saleRepo.create({
        invoiceNumber,
        saleTime,
        cashierId: ownerId,
        customerId: spec.customer ? customerIds.get(spec.customer) ?? null : null,
        subtotal: subtotal.toFixed(2),
        discountTotal: '0.00',
        taxTotal: '0.00',
        grandTotal: subtotal.toFixed(2),
        status: SaleStatus.COMPLETED,
        notes: null,
      }),
    );
    const saleId = Number(sale.id);
    const savedItems: SaleItem[] = [];

    for (const line of lines) {
      const productId = Number(line.product.id);
      const item = await saleItemRepo.save(
        saleItemRepo.create({
          saleId,
          productId,
          qty: line.qty,
          unitPrice: line.unitPrice.toFixed(2),
          discountAmount: '0.00',
          taxAmount: '0.00',
          lineTotal: line.lineTotal.toFixed(2),
        }),
      );
      savedItems.push(item);

      if (line.product.productType !== ProductType.SERVICE) {
        const balance = await stockRepo.findOne({ where: { productId } });
        if (!balance || balance.onHandQty < line.qty) {
          throw new Error(`Not enough seeded stock for ${line.product.sku}`);
        }
        balance.onHandQty -= line.qty;
        await stockRepo.save(balance);

        const costUsed =
          line.assignedImeis && line.assignedImeis[0]?.costPrice
            ? line.assignedImeis[0].costPrice
            : line.product.costPrice || '0.00';

        await movementRepo.save(
          movementRepo.create({
            productId,
            movementType: MovementType.OUT,
            qty: line.qty,
            unitCost: costUsed,
            refType: 'SALE',
            refId: saleId,
            createdBy: ownerId,
            notes: null,
            imeiUnitId: null,
            movementTime: saleTime,
          }),
        );
      }

      if (line.product.productType === ProductType.SERIALIZED && line.assignedImeis) {
        for (const imeiUnit of line.assignedImeis) {
          await saleItemImeiRepo.save(
            saleItemImeiRepo.create({
              saleItemId: Number(item.id),
              imeiUnitId: Number(imeiUnit.id),
            }),
          );
          imeiUnit.status = ImeiStatus.SOLD;
          imeiUnit.lastRefType = 'SALE';
          imeiUnit.lastRefId = saleId;
          await imeiRepo.save(imeiUnit);
        }
      }
    }

    await paymentRepo.save(
      paymentRepo.create({
        saleId,
        method: spec.method,
        amount: subtotal.toFixed(2),
        referenceNo:
          spec.method === PaymentMethod.BANK_TRANSFER
            ? `TRF-${saleId}`
            : spec.method === PaymentMethod.E_WALLET
              ? `EWL-${saleId}`
              : null,
      }),
    );

    savedSales.push({ sale, items: savedItems, spec });
  }

  // Seed 1 Return
  const returnEligible = savedSales.find((s) =>
    s.items.some((item) => {
      const p = Array.from(products.values()).find(
        (pr) => Number(pr.id) === Number(item.productId),
      );
      return p?.productType === ProductType.NON_SERIALIZED;
    }),
  );

  if (returnEligible) {
    const returnRepo = dataSource.getRepository(Return);
    const returnItemRepo = dataSource.getRepository(ReturnItem);
    const returnItem = returnEligible.items.find((item) => {
      const p = Array.from(products.values()).find(
        (pr) => Number(pr.id) === Number(item.productId),
      );
      return p?.productType === ProductType.NON_SERIALIZED;
    })!;

    const returnSaleTime = daysAgo(1, 14);
    const returnDoc = await returnRepo.save(
      returnRepo.create({
        returnNumber: `RET-${ymd(returnSaleTime)}-0001`,
        saleId: Number(returnEligible.sale.id),
        returnTime: returnSaleTime,
        processedBy: ownerId,
        refundTotal: returnItem.unitPrice,
        refundMethod: RefundMethod.CASH,
        reason: 'Customer changed mind (sealed box)',
        status: ReturnStatus.COMPLETED,
      }),
    );

    await returnItemRepo.save(
      returnItemRepo.create({
        returnId: Number(returnDoc.id),
        saleItemId: Number(returnItem.id),
        productId: Number(returnItem.productId),
        qty: 1,
        unitRefund: returnItem.unitPrice,
        lineRefundTotal: returnItem.unitPrice,
        restockType: RestockType.SELLABLE,
      }),
    );

    const balance = await stockRepo.findOne({
      where: { productId: Number(returnItem.productId) },
    });
    if (balance) {
      balance.onHandQty += 1;
      await stockRepo.save(balance);
    }
  }

  console.log('[seed] demo data seeded successfully');
}
