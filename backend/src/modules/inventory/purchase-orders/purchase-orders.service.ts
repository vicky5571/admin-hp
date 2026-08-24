import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { MovementType } from '../../../common/enums/movement-type.enum';
import { PoPaymentStatus } from '../../../common/enums/po-payment-status.enum';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ExpressBuybackDto } from '../dto/express-buyback.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { RecordPoPaymentDto } from '../dto/record-po-payment.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { GoodsReceiptItemImei } from '../entities/goods-receipt-item-imei.entity';
import { StockBalance } from '../entities/stock-balance.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { Product } from '../../catalog/entities/product.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: ListPurchaseOrdersQueryDto) {
    const qb = this.poRepo.createQueryBuilder('po');

    if (query.supplierId) {
      qb.andWhere('po.supplierId = :supplierId', {
        supplierId: query.supplierId,
      });
    }
    if (query.status) {
      qb.andWhere('po.status = :status', { status: query.status });
    }
    if (query.paymentStatus) {
      qb.andWhere('po.paymentStatus = :paymentStatus', {
        paymentStatus: query.paymentStatus,
      });
    }
    if (query.isOverdue === 'true') {
      qb.andWhere(
        'po.paymentStatus != :paidStatus AND po.paymentDueDate IS NOT NULL AND po.paymentDueDate < CURRENT_DATE',
        { paidStatus: PoPaymentStatus.PAID },
      );
    }
    if (query.dateFrom) {
      qb.andWhere('po.orderDate >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('po.orderDate <= :dateTo', { dateTo: query.dateTo });
    }

    qb.leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.items', 'items')
      .leftJoinAndSelect('items.product', 'product')
      .orderBy('po.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
    const row = await this.poRepo.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.product', 'creator'],
    });
    if (!row) {
      throw new NotFoundException('Purchase order not found');
    }
    return row;
  }

  async create(dto: CreatePurchaseOrderDto, userId: number) {
    let supplierName = 'Walk-in Customer';
    let supplier: Supplier | null = null;
    if (dto.supplierId) {
      supplier = await this.supplierRepo.findOne({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException('Supplier not found');
      }
      supplierName = supplier.name;
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('PO must have at least one item');
    }

    const poNumber = await this.generatePoNumber();

    const items = dto.items.map((i) =>
      this.dataSource.getRepository(PurchaseOrderItem).create({
        productId: i.productId,
        orderedQty: i.orderedQty,
        receivedQty: 0,
        unitCost: i.unitCost.toFixed(2),
      }),
    );

    let paymentDueDate = dto.paymentDueDate ?? null;
    let paymentStatus =
      (dto.paymentStatus as PoPaymentStatus) || PoPaymentStatus.UNPAID;
    let paidAmount =
      dto.paidAmount !== undefined ? dto.paidAmount.toFixed(2) : '0.00';

    if (!dto.supplierId) {
      // Walk-in purchase is cash-out on the spot
      paymentDueDate = paymentDueDate || dto.orderDate;
      paymentStatus = PoPaymentStatus.PAID;
      const totalAmount = dto.items.reduce(
        (sum, item) => sum + item.unitCost * item.orderedQty,
        0,
      );
      paidAmount = totalAmount.toFixed(2);
    } else if (supplier && supplier.paymentTermsDays > 0 && !paymentDueDate) {
      const orderD = new Date(dto.orderDate);
      orderD.setDate(orderD.getDate() + Number(supplier.paymentTermsDays));
      paymentDueDate = orderD.toISOString().slice(0, 10);
    }

    const po = this.poRepo.create({
      poNumber,
      supplierId: dto.supplierId ?? null,
      status: PoStatus.DRAFT,
      paymentStatus,
      paymentDueDate,
      paidAmount,
      orderDate: dto.orderDate,
      expectedDate: dto.expectedDate ?? null,
      notes: dto.notes ?? null,
      createdBy: userId,
      items,
    });

    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId,
      action: 'PO_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(saved.id),
      metadataJson: {
        poNumber: saved.poNumber,
        supplierId: saved.supplierId,
        supplierName,
        paymentStatus: saved.paymentStatus,
        paymentDueDate: saved.paymentDueDate,
        itemsCount: saved.items.length,
      },
    });

    return saved;
  }

  async update(id: number, dto: UpdatePurchaseOrderDto, userId: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot edit purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be edited.`,
      );
    }

    let supplierName = 'Walk-in Customer';
    if (dto.supplierId) {
      const supplier = await this.supplierRepo.findOne({
        where: { id: dto.supplierId },
      });
      if (!supplier) {
        throw new BadRequestException('Supplier not found');
      }
      supplierName = supplier.name;
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('PO must have at least one item');
    }

    // Delete existing items
    await this.dataSource
      .getRepository(PurchaseOrderItem)
      .delete({ purchaseOrderId: id });

    // Create new items
    const items = dto.items.map((i) =>
      this.dataSource.getRepository(PurchaseOrderItem).create({
        purchaseOrderId: id,
        productId: i.productId,
        orderedQty: i.orderedQty,
        receivedQty: 0,
        unitCost: i.unitCost.toFixed(2),
      }),
    );

    po.supplierId = dto.supplierId ?? null;
    po.orderDate = dto.orderDate;
    po.expectedDate = dto.expectedDate ?? null;
    if (dto.paymentDueDate !== undefined) {
      po.paymentDueDate = dto.paymentDueDate || null;
    }
    if (dto.paymentStatus) {
      po.paymentStatus = dto.paymentStatus as PoPaymentStatus;
    }
    if (dto.paidAmount !== undefined) {
      po.paidAmount = dto.paidAmount.toFixed(2);
    }
    po.notes = dto.notes ?? null;
    po.status = PoStatus.DRAFT; // auto-resets REJECTED back to DRAFT on edit
    po.items = items;

    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId,
      action: 'PO_UPDATED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(saved.id),
      metadataJson: {
        poNumber: saved.poNumber,
        supplierId: saved.supplierId,
        supplierName,
        itemsCount: saved.items.length,
      },
    });

    return this.findOne(id);
  }

  async remove(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot delete purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be deleted.`,
      );
    }

    const grCount = await this.dataSource
      .getRepository(GoodsReceipt)
      .count({ where: { purchaseOrderId: id } });
    if (grCount > 0) {
      throw new BadRequestException(
        'Cannot delete purchase order with existing goods receipts.',
      );
    }

    await this.poRepo.delete(id);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'PO_DELETED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: { poNumber: po.poNumber },
    });

    return { success: true, message: 'Purchase order deleted successfully' };
  }

  async submit(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot submit PO with status ${po.status}. Only DRAFT or REJECTED POs can be submitted.`,
      );
    }
    po.status = PoStatus.SUBMITTED;
    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'PO_SUBMITTED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: { poNumber: po.poNumber },
    });

    return saved;
  }

  async approve(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot approve PO with status ${po.status}. Only SUBMITTED POs can be approved.`,
      );
    }
    po.status = PoStatus.APPROVED;
    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'PO_APPROVED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: { poNumber: po.poNumber },
    });

    return saved;
  }

  async reject(id: number, reason?: string, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject PO with status ${po.status}. Only SUBMITTED POs can be rejected.`,
      );
    }
    po.status = PoStatus.REJECTED;
    if (reason && reason.trim()) {
      const rejectNote = `[Rejection Note: ${reason.trim()}]`;
      po.notes = po.notes ? `${po.notes}\n${rejectNote}` : rejectNote;
    }
    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'PO_REJECTED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: { poNumber: po.poNumber, reason: reason?.trim() },
    });

    return saved;
  }

  async cancel(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (
      po.status === PoStatus.COMPLETED ||
      po.status === PoStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel PO with status ${po.status}`,
      );
    }
    po.status = PoStatus.CANCELLED;
    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'PO_CANCELLED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: { poNumber: po.poNumber },
    });

    return saved;
  }

  // ── Global IMEI Trace & Procurement Lookup ──────────────────────
  async imeiTrace(imei: string) {
    const cleanImei = (imei || '').trim();
    if (!cleanImei) {
      throw new BadRequestException('IMEI is required');
    }

    const imeiRow = await this.dataSource.getRepository(ImeiUnit).findOne({
      where: { imei: cleanImei },
      relations: ['product', 'product.brand', 'product.category'],
    });

    if (!imeiRow) {
      throw new NotFoundException(`No device found with IMEI ${cleanImei}`);
    }

    // Trace GRN Item & PO
    const grImei = await this.dataSource
      .getRepository(GoodsReceiptItemImei)
      .createQueryBuilder('grii')
      .innerJoinAndSelect('grii.goodsReceiptItem', 'gri')
      .innerJoinAndSelect('gri.goodsReceipt', 'gr')
      .leftJoinAndSelect('gr.receiver', 'receiver')
      .leftJoinAndSelect('gr.purchaseOrder', 'po')
      .leftJoinAndSelect('po.supplier', 'supplier')
      .leftJoinAndSelect('po.creator', 'creator')
      .where('grii.imeiUnitId = :imeiUnitId', { imeiUnitId: imeiRow.id })
      .orderBy('gr.createdAt', 'DESC')
      .getOne();

    // Check if device was sold
    const saleItem = await this.dataSource.query(
      `SELECT s.id, s.sale_number, s.sale_time, s.customer_name, s.customer_phone, si.unit_price, si.line_total, u.full_name as cashier_name
       FROM sale_item_imeis sii
       JOIN sale_items si ON si.id = sii.sale_item_id
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE sii.imei_unit_id = $1
       ORDER BY s.sale_time DESC
       LIMIT 1`,
      [imeiRow.id],
    );

    return {
      imeiUnit: {
        id: imeiRow.id,
        imei: imeiRow.imei,
        status: imeiRow.status,
        conditionGrade: imeiRow.conditionGrade,
        batteryHealth: imeiRow.batteryHealth,
        costPrice: imeiRow.costPrice ? parseFloat(imeiRow.costPrice as any) : null,
        sellingPrice: imeiRow.sellingPrice ? parseFloat(imeiRow.sellingPrice as any) : null,
        createdAt: imeiRow.createdAt,
      },
      product: {
        id: imeiRow.product?.id,
        sku: imeiRow.product?.sku,
        name: imeiRow.product?.name,
        brand: imeiRow.product?.brand?.name,
        category: imeiRow.product?.category?.name,
      },
      source: {
        type: grImei?.goodsReceiptItem?.goodsReceipt?.purchaseOrder?.supplier ? 'SUPPLIER' : 'WALK_IN',
        supplierName: grImei?.goodsReceiptItem?.goodsReceipt?.purchaseOrder?.supplier?.name ?? 'Walk-in Customer',
        supplierCode: grImei?.goodsReceiptItem?.goodsReceipt?.purchaseOrder?.supplier?.supplierCode ?? null,
      },
      procurement: grImei?.goodsReceiptItem?.goodsReceipt?.purchaseOrder
        ? {
            id: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.id,
            poNumber: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.poNumber,
            orderDate: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.orderDate,
            unitCost: parseFloat(grImei.goodsReceiptItem.unitCost || '0'),
            actualUnitCost: grImei.goodsReceiptItem.actualUnitCost ? parseFloat(grImei.goodsReceiptItem.actualUnitCost) : null,
            status: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.status,
            notes: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.notes,
            createdBy: grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.creator?.fullName || `#${grImei.goodsReceiptItem.goodsReceipt.purchaseOrder.createdBy}`,
          }
        : null,
      receiving: grImei?.goodsReceiptItem?.goodsReceipt
        ? {
            id: grImei.goodsReceiptItem.goodsReceipt.id,
            grnNumber: grImei.goodsReceiptItem.goodsReceipt.grnNumber,
            receiveDate: grImei.goodsReceiptItem.goodsReceipt.receiveDate,
            receivedBy: grImei.goodsReceiptItem.goodsReceipt.receiver?.fullName || `#${grImei.goodsReceiptItem.goodsReceipt.receivedBy}`,
            conditionStatus: grImei.goodsReceiptItem.conditionStatus,
            conditionNotes: grImei.goodsReceiptItem.conditionNotes,
          }
        : null,
      salesInfo: saleItem && saleItem.length > 0
        ? {
            id: saleItem[0].id,
            saleNumber: saleItem[0].sale_number,
            saleTime: saleItem[0].sale_time,
            customerName: saleItem[0].customer_name,
            customerPhone: saleItem[0].customer_phone,
            unitPrice: parseFloat(saleItem[0].unit_price || '0'),
            cashierName: saleItem[0].cashier_name,
          }
        : null,
    };
  }

  // ── Express Buyback (Used Smartphone Single-Step Purchase) ─────────
  async expressBuyback(dto: ExpressBuybackDto, userId: number) {
    const cleanImei = (dto.imei || '').trim();
    if (!cleanImei) {
      throw new BadRequestException('IMEI is required for express buyback');
    }

    const product = await this.dataSource.getRepository(Product).findOne({
      where: { id: dto.productId },
    });
    if (!product) {
      throw new BadRequestException('Product not found');
    }

    const existingImei = await this.dataSource.getRepository(ImeiUnit).findOne({
      where: { imei: cleanImei },
    });
    if (existingImei) {
      throw new ConflictException(`IMEI ${cleanImei} already exists in the system`);
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const poNumber = await this.generatePoNumber('BB');
    const grnNumber = await this.generateGrnNumber();

    const result = await this.dataSource.transaction(async (manager) => {
      const poRepo = manager.getRepository(PurchaseOrder);
      const poItemRepo = manager.getRepository(PurchaseOrderItem);
      const grRepo = manager.getRepository(GoodsReceipt);
      const grItemRepo = manager.getRepository(GoodsReceiptItem);
      const grImeiRepo = manager.getRepository(GoodsReceiptItemImei);
      const imeiRepo = manager.getRepository(ImeiUnit);
      const balanceRepo = manager.getRepository(StockBalance);
      const movementRepo = manager.getRepository(StockMovement);

      // 1. Create completed PO
      const totalBuyout = dto.unitCost;
      const po = poRepo.create({
        poNumber,
        supplierId: null, // Walk-in Customer
        status: PoStatus.COMPLETED,
        paymentStatus: PoPaymentStatus.PAID,
        paymentDueDate: todayStr,
        paidAmount: totalBuyout.toFixed(2),
        paidAt: new Date(),
        orderDate: todayStr,
        expectedDate: todayStr,
        notes: dto.notes ? `Express Buyback: ${dto.notes}` : 'Express Buyback (Used Smartphone)',
        createdBy: userId,
      });
      const savedPo = await poRepo.save(po);

      // 2. Create PO item
      const poItem = poItemRepo.create({
        purchaseOrderId: savedPo.id,
        productId: dto.productId,
        orderedQty: 1,
        receivedQty: 1,
        unitCost: dto.unitCost.toFixed(2),
      });
      const savedPoItem = await poItemRepo.save(poItem);

      // 3. Create Goods Receipt
      const gr = grRepo.create({
        grnNumber,
        purchaseOrderId: savedPo.id,
        receiveDate: new Date(),
        receivedBy: userId,
        notes: dto.notes ? `Express Buyback: ${dto.notes}` : 'Express Buyback Receipt',
      });
      const savedGr = await grRepo.save(gr);

      // 4. Create GR Item
      const grItem = grItemRepo.create({
        goodsReceiptId: savedGr.id,
        poItemId: savedPoItem.id,
        productId: dto.productId,
        receivedQty: 1,
        unitCost: dto.unitCost.toFixed(2),
        actualUnitCost: dto.unitCost.toFixed(2),
        conditionStatus: dto.conditionGrade || 'GOOD',
        conditionNotes: dto.notes ?? null,
      });
      const savedGrItem = await grItemRepo.save(grItem);

      // 5. Create IMEI unit
      const imeiUnit = imeiRepo.create({
        imei: cleanImei,
        productId: dto.productId,
        status: ImeiStatus.IN_STOCK,
        currentLocation: 'STORE',
        conditionGrade: dto.conditionGrade ?? null,
        batteryHealth: dto.batteryHealth ?? null,
        costPrice: dto.unitCost.toFixed(2),
        sellingPrice: dto.sellingPrice ? dto.sellingPrice.toFixed(2) : null,
        lastRefType: 'GRN',
        lastRefId: savedGr.id,
      });
      const savedImei = await imeiRepo.save(imeiUnit);

      // 6. Link IMEI to GR Item
      const grImei = grImeiRepo.create({
        goodsReceiptItemId: savedGrItem.id,
        imeiUnitId: savedImei.id,
      });
      await grImeiRepo.save(grImei);

      // 7. Update Stock Balance
      let balance = await balanceRepo.findOne({
        where: { productId: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!balance) {
        balance = balanceRepo.create({
          productId: dto.productId,
          onHandQty: 0,
          reservedQty: 0,
        });
      }
      balance.onHandQty += 1;
      await balanceRepo.save(balance);

      // 8. Stock Movement
      const movement = movementRepo.create({
        productId: dto.productId,
        imeiUnitId: savedImei.id,
        movementType: MovementType.IN,
        qty: 1,
        unitCost: dto.unitCost.toFixed(2),
        refType: 'GRN',
        refId: savedGr.id,
        createdBy: userId,
        notes: `Express Buyback (${cleanImei})`,
      });
      await movementRepo.save(movement);

      return {
        purchaseOrder: savedPo,
        goodsReceipt: savedGr,
        imeiUnit: savedImei,
      };
    });

    await this.auditLogsService.log({
      userId,
      action: 'EXPRESS_BUYBACK_CREATED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(result.purchaseOrder.id),
      metadataJson: {
        poNumber: result.purchaseOrder.poNumber,
        grnNumber: result.goodsReceipt.grnNumber,
        imei: cleanImei,
        productId: dto.productId,
        productName: product.name,
        unitCost: dto.unitCost,
        sellingPrice: dto.sellingPrice,
        conditionGrade: dto.conditionGrade,
        batteryHealth: dto.batteryHealth,
      },
    });

    return result;
  }

  // ── Record Supplier Payment (Accounts Payable) ───────────────────
  async recordPayment(id: number, dto: RecordPoPaymentDto, userId: number) {
    const po = await this.findOne(id);
    if (po.status === PoStatus.CANCELLED) {
      throw new BadRequestException('Cannot record payment on a cancelled PO');
    }

    const poTotal = po.items.reduce(
      (sum, i) => sum + parseFloat(i.unitCost || '0') * i.orderedQty,
      0,
    );

    const currentPaid = parseFloat(po.paidAmount || '0');
    const paymentAmount = Number(dto.amount);
    const newPaid = currentPaid + paymentAmount;

    po.paidAmount = newPaid.toFixed(2);
    po.paidAt = dto.paymentDate ? new Date(dto.paymentDate) : new Date();

    if (newPaid >= poTotal - 0.01) {
      po.paymentStatus = PoPaymentStatus.PAID;
    } else {
      po.paymentStatus = PoPaymentStatus.PARTIALLY_PAID;
    }

    const saved = await this.poRepo.save(po);

    await this.auditLogsService.log({
      userId,
      action: 'PO_PAYMENT_RECORDED',
      entityType: 'PURCHASE_ORDER',
      entityId: Number(id),
      metadataJson: {
        poNumber: po.poNumber,
        paymentAmount,
        totalPaid: newPaid,
        poTotal,
        paymentStatus: po.paymentStatus,
        paymentMethod: dto.paymentMethod,
        notes: dto.notes,
      },
    });

    return saved;
  }

  // ── Capital Outlay & AP KPI Summary ──────────────────────────────
  async getApKpis() {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .slice(0, 10);
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
      .toISOString()
      .slice(0, 10);

    const monthlySql = `
      SELECT
        COALESCE(SUM(poi.unit_cost * poi.ordered_qty), 0)::numeric(14,2) AS total_procurement_month,
        COALESCE(SUM(CASE WHEN po.supplier_id IS NOT NULL THEN (poi.unit_cost * poi.ordered_qty) ELSE 0 END), 0)::numeric(14,2) AS new_stock_outlay_month,
        COALESCE(SUM(CASE WHEN po.supplier_id IS NULL THEN (poi.unit_cost * poi.ordered_qty) ELSE 0 END), 0)::numeric(14,2) AS used_buyback_outlay_month,
        COUNT(DISTINCT po.id)::int AS po_count_month
      FROM purchase_orders po
      JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
      WHERE po.order_date >= $1 AND po.order_date <= $2
        AND po.status != 'CANCELLED'
    `;
    const monthlyRes = await this.dataSource.query(monthlySql, [
      firstDayOfMonth,
      lastDayOfMonth,
    ]);

    const payablesSql = `
      SELECT
        COALESCE(SUM(po_totals.total_cost - po_totals.paid_amount), 0)::numeric(14,2) AS outstanding_payables,
        COALESCE(SUM(CASE WHEN po_totals.payment_due_date < CURRENT_DATE THEN (po_totals.total_cost - po_totals.paid_amount) ELSE 0 END), 0)::numeric(14,2) AS overdue_payables,
        COUNT(CASE WHEN po_totals.payment_due_date < CURRENT_DATE THEN 1 END)::int AS overdue_count
      FROM (
        SELECT
          po.id,
          po.payment_due_date,
          po.paid_amount,
          COALESCE(SUM(poi.unit_cost * poi.ordered_qty), 0) AS total_cost
        FROM purchase_orders po
        JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
        WHERE po.supplier_id IS NOT NULL
          AND po.payment_status != 'PAID'
          AND po.status != 'CANCELLED'
        GROUP BY po.id, po.payment_due_date, po.paid_amount
      ) po_totals
    `;
    const payablesRes = await this.dataSource.query(payablesSql);

    const pendingGrnCount = await this.poRepo
      .createQueryBuilder('po')
      .where('po.status IN (:...statuses)', {
        statuses: [PoStatus.APPROVED, PoStatus.PARTIALLY_RECEIVED],
      })
      .getCount();

    return {
      monthPeriod: {
        from: firstDayOfMonth,
        to: lastDayOfMonth,
      },
      totalProcurementThisMonth: parseFloat(
        monthlyRes[0]?.total_procurement_month || '0',
      ),
      newStockOutlayThisMonth: parseFloat(
        monthlyRes[0]?.new_stock_outlay_month || '0',
      ),
      usedBuybackOutlayThisMonth: parseFloat(
        monthlyRes[0]?.used_buyback_outlay_month || '0',
      ),
      poCountThisMonth: Number(monthlyRes[0]?.po_count_month || 0),
      outstandingPayables: parseFloat(
        payablesRes[0]?.outstanding_payables || '0',
      ),
      overduePayables: parseFloat(payablesRes[0]?.overdue_payables || '0'),
      overdueCount: Number(payablesRes[0]?.overdue_count || 0),
      pendingGoodsReceiptCount: pendingGrnCount,
    };
  }

  private async generatePoNumber(prefix = 'PO'): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');

    const todayPrefix = `${prefix}-${ymd}-`;
    const count = await this.poRepo
      .createQueryBuilder('po')
      .where('po.poNumber LIKE :prefix', { prefix: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(3, '0');
    const candidate = `${todayPrefix}${seq}`;

    const exists = await this.poRepo.findOne({
      where: { poNumber: candidate },
    });
    if (exists) {
      return `${todayPrefix}${Date.now().toString().slice(-6)}`;
    }
    return candidate;
  }

  private async generateGrnNumber(): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');

    const todayPrefix = `GRN-${ymd}-`;
    const count = await this.dataSource
      .getRepository(GoodsReceipt)
      .createQueryBuilder('gr')
      .where('gr.grnNumber LIKE :prefix', { prefix: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(3, '0');
    const candidate = `${todayPrefix}${seq}`;

    const exists = await this.dataSource
      .getRepository(GoodsReceipt)
      .findOne({
        where: { grnNumber: candidate },
      });
    if (exists) {
      return `${todayPrefix}${Date.now().toString().slice(-6)}`;
    }
    return candidate;
  }
}
