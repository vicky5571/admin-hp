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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PurchaseOrdersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const imei_status_enum_1 = require("../../../common/enums/imei-status.enum");
const movement_type_enum_1 = require("../../../common/enums/movement-type.enum");
const po_payment_status_enum_1 = require("../../../common/enums/po-payment-status.enum");
const po_status_enum_1 = require("../../../common/enums/po-status.enum");
const pagination_util_1 = require("../../../common/utils/pagination.util");
const purchase_order_entity_1 = require("../entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../entities/purchase-order-item.entity");
const supplier_entity_1 = require("../entities/supplier.entity");
const goods_receipt_entity_1 = require("../entities/goods-receipt.entity");
const goods_receipt_item_entity_1 = require("../entities/goods-receipt-item.entity");
const goods_receipt_item_imei_entity_1 = require("../entities/goods-receipt-item-imei.entity");
const stock_balance_entity_1 = require("../entities/stock-balance.entity");
const stock_movement_entity_1 = require("../entities/stock-movement.entity");
const imei_unit_entity_1 = require("../../imei/entities/imei-unit.entity");
const product_entity_1 = require("../../catalog/entities/product.entity");
const audit_logs_service_1 = require("../../audit-logs/audit-logs.service");
let PurchaseOrdersService = class PurchaseOrdersService {
    constructor(poRepo, supplierRepo, dataSource, auditLogsService) {
        this.poRepo = poRepo;
        this.supplierRepo = supplierRepo;
        this.dataSource = dataSource;
        this.auditLogsService = auditLogsService;
    }
    async findAll(query) {
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
            qb.andWhere('po.paymentStatus != :paidStatus AND po.paymentDueDate IS NOT NULL AND po.paymentDueDate < CURRENT_DATE', { paidStatus: po_payment_status_enum_1.PoPaymentStatus.PAID });
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
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async findOne(id) {
        const row = await this.poRepo.findOne({
            where: { id },
            relations: ['supplier', 'items', 'items.product', 'creator'],
        });
        if (!row) {
            throw new common_1.NotFoundException('Purchase order not found');
        }
        return row;
    }
    async create(dto, userId) {
        let supplierName = 'Walk-in Customer';
        let supplier = null;
        if (dto.supplierId) {
            supplier = await this.supplierRepo.findOne({
                where: { id: dto.supplierId },
            });
            if (!supplier) {
                throw new common_1.BadRequestException('Supplier not found');
            }
            supplierName = supplier.name;
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('PO must have at least one item');
        }
        const poNumber = await this.generatePoNumber();
        const items = dto.items.map((i) => this.dataSource.getRepository(purchase_order_item_entity_1.PurchaseOrderItem).create({
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: 0,
            unitCost: i.unitCost.toFixed(2),
        }));
        let paymentDueDate = dto.paymentDueDate ?? null;
        let paymentStatus = dto.paymentStatus || po_payment_status_enum_1.PoPaymentStatus.UNPAID;
        let paidAmount = dto.paidAmount !== undefined ? dto.paidAmount.toFixed(2) : '0.00';
        if (!dto.supplierId) {
            paymentDueDate = paymentDueDate || dto.orderDate;
            paymentStatus = po_payment_status_enum_1.PoPaymentStatus.PAID;
            const totalAmount = dto.items.reduce((sum, item) => sum + item.unitCost * item.orderedQty, 0);
            paidAmount = totalAmount.toFixed(2);
        }
        else if (supplier && supplier.paymentTermsDays > 0 && !paymentDueDate) {
            const orderD = new Date(dto.orderDate);
            orderD.setDate(orderD.getDate() + Number(supplier.paymentTermsDays));
            paymentDueDate = orderD.toISOString().slice(0, 10);
        }
        const po = this.poRepo.create({
            poNumber,
            supplierId: dto.supplierId ?? null,
            status: po_status_enum_1.PoStatus.DRAFT,
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
    async update(id, dto, userId) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.DRAFT && po.status !== po_status_enum_1.PoStatus.REJECTED) {
            throw new common_1.BadRequestException(`Cannot edit purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be edited.`);
        }
        let supplierName = 'Walk-in Customer';
        if (dto.supplierId) {
            const supplier = await this.supplierRepo.findOne({
                where: { id: dto.supplierId },
            });
            if (!supplier) {
                throw new common_1.BadRequestException('Supplier not found');
            }
            supplierName = supplier.name;
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('PO must have at least one item');
        }
        await this.dataSource
            .getRepository(purchase_order_item_entity_1.PurchaseOrderItem)
            .delete({ purchaseOrderId: id });
        const items = dto.items.map((i) => this.dataSource.getRepository(purchase_order_item_entity_1.PurchaseOrderItem).create({
            purchaseOrderId: id,
            productId: i.productId,
            orderedQty: i.orderedQty,
            receivedQty: 0,
            unitCost: i.unitCost.toFixed(2),
        }));
        po.supplierId = dto.supplierId ?? null;
        po.orderDate = dto.orderDate;
        po.expectedDate = dto.expectedDate ?? null;
        if (dto.paymentDueDate !== undefined) {
            po.paymentDueDate = dto.paymentDueDate || null;
        }
        if (dto.paymentStatus) {
            po.paymentStatus = dto.paymentStatus;
        }
        if (dto.paidAmount !== undefined) {
            po.paidAmount = dto.paidAmount.toFixed(2);
        }
        po.notes = dto.notes ?? null;
        po.status = po_status_enum_1.PoStatus.DRAFT;
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
    async remove(id, userId) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.DRAFT && po.status !== po_status_enum_1.PoStatus.REJECTED) {
            throw new common_1.BadRequestException(`Cannot delete purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be deleted.`);
        }
        const grCount = await this.dataSource
            .getRepository(goods_receipt_entity_1.GoodsReceipt)
            .count({ where: { purchaseOrderId: id } });
        if (grCount > 0) {
            throw new common_1.BadRequestException('Cannot delete purchase order with existing goods receipts.');
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
    async submit(id, userId) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.DRAFT && po.status !== po_status_enum_1.PoStatus.REJECTED) {
            throw new common_1.BadRequestException(`Cannot submit PO with status ${po.status}. Only DRAFT or REJECTED POs can be submitted.`);
        }
        po.status = po_status_enum_1.PoStatus.SUBMITTED;
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
    async approve(id, userId) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.SUBMITTED) {
            throw new common_1.BadRequestException(`Cannot approve PO with status ${po.status}. Only SUBMITTED POs can be approved.`);
        }
        po.status = po_status_enum_1.PoStatus.APPROVED;
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
    async reject(id, reason, userId) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.SUBMITTED) {
            throw new common_1.BadRequestException(`Cannot reject PO with status ${po.status}. Only SUBMITTED POs can be rejected.`);
        }
        po.status = po_status_enum_1.PoStatus.REJECTED;
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
    async cancel(id, userId) {
        const po = await this.findOne(id);
        if (po.status === po_status_enum_1.PoStatus.COMPLETED ||
            po.status === po_status_enum_1.PoStatus.CANCELLED) {
            throw new common_1.BadRequestException(`Cannot cancel PO with status ${po.status}`);
        }
        po.status = po_status_enum_1.PoStatus.CANCELLED;
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
    async imeiTrace(imei) {
        const cleanImei = (imei || '').trim();
        if (!cleanImei) {
            throw new common_1.BadRequestException('IMEI is required');
        }
        const imeiRow = await this.dataSource.getRepository(imei_unit_entity_1.ImeiUnit).findOne({
            where: { imei: cleanImei },
            relations: ['product', 'product.brand', 'product.category'],
        });
        if (!imeiRow) {
            throw new common_1.NotFoundException(`No device found with IMEI ${cleanImei}`);
        }
        const grImei = await this.dataSource
            .getRepository(goods_receipt_item_imei_entity_1.GoodsReceiptItemImei)
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
        const saleItem = await this.dataSource.query(`SELECT s.id, s.sale_number, s.sale_time, s.customer_name, s.customer_phone, si.unit_price, si.line_total, u.full_name as cashier_name
       FROM sale_item_imeis sii
       JOIN sale_items si ON si.id = sii.sale_item_id
       JOIN sales s ON s.id = si.sale_id
       LEFT JOIN users u ON u.id = s.user_id
       WHERE sii.imei_unit_id = $1
       ORDER BY s.sale_time DESC
       LIMIT 1`, [imeiRow.id]);
        return {
            imeiUnit: {
                id: imeiRow.id,
                imei: imeiRow.imei,
                status: imeiRow.status,
                conditionGrade: imeiRow.conditionGrade,
                batteryHealth: imeiRow.batteryHealth,
                costPrice: imeiRow.costPrice ? parseFloat(imeiRow.costPrice) : null,
                sellingPrice: imeiRow.sellingPrice ? parseFloat(imeiRow.sellingPrice) : null,
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
    async expressBuyback(dto, userId) {
        const cleanImei = (dto.imei || '').trim();
        if (!cleanImei) {
            throw new common_1.BadRequestException('IMEI is required for express buyback');
        }
        const product = await this.dataSource.getRepository(product_entity_1.Product).findOne({
            where: { id: dto.productId },
        });
        if (!product) {
            throw new common_1.BadRequestException('Product not found');
        }
        const existingImei = await this.dataSource.getRepository(imei_unit_entity_1.ImeiUnit).findOne({
            where: { imei: cleanImei },
        });
        if (existingImei) {
            throw new common_1.ConflictException(`IMEI ${cleanImei} already exists in the system`);
        }
        const todayStr = new Date().toISOString().slice(0, 10);
        const poNumber = await this.generatePoNumber('BB');
        const grnNumber = await this.generateGrnNumber();
        const result = await this.dataSource.transaction(async (manager) => {
            const poRepo = manager.getRepository(purchase_order_entity_1.PurchaseOrder);
            const poItemRepo = manager.getRepository(purchase_order_item_entity_1.PurchaseOrderItem);
            const grRepo = manager.getRepository(goods_receipt_entity_1.GoodsReceipt);
            const grItemRepo = manager.getRepository(goods_receipt_item_entity_1.GoodsReceiptItem);
            const grImeiRepo = manager.getRepository(goods_receipt_item_imei_entity_1.GoodsReceiptItemImei);
            const imeiRepo = manager.getRepository(imei_unit_entity_1.ImeiUnit);
            const balanceRepo = manager.getRepository(stock_balance_entity_1.StockBalance);
            const movementRepo = manager.getRepository(stock_movement_entity_1.StockMovement);
            const totalBuyout = dto.unitCost;
            const po = poRepo.create({
                poNumber,
                supplierId: null,
                status: po_status_enum_1.PoStatus.COMPLETED,
                paymentStatus: po_payment_status_enum_1.PoPaymentStatus.PAID,
                paymentDueDate: todayStr,
                paidAmount: totalBuyout.toFixed(2),
                paidAt: new Date(),
                orderDate: todayStr,
                expectedDate: todayStr,
                notes: dto.notes ? `Express Buyback: ${dto.notes}` : 'Express Buyback (Used Smartphone)',
                createdBy: userId,
            });
            const savedPo = await poRepo.save(po);
            const poItem = poItemRepo.create({
                purchaseOrderId: savedPo.id,
                productId: dto.productId,
                orderedQty: 1,
                receivedQty: 1,
                unitCost: dto.unitCost.toFixed(2),
            });
            const savedPoItem = await poItemRepo.save(poItem);
            const gr = grRepo.create({
                grnNumber,
                purchaseOrderId: savedPo.id,
                receiveDate: new Date(),
                receivedBy: userId,
                notes: dto.notes ? `Express Buyback: ${dto.notes}` : 'Express Buyback Receipt',
            });
            const savedGr = await grRepo.save(gr);
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
            const imeiUnit = imeiRepo.create({
                imei: cleanImei,
                productId: dto.productId,
                status: imei_status_enum_1.ImeiStatus.IN_STOCK,
                currentLocation: 'STORE',
                conditionGrade: dto.conditionGrade ?? null,
                batteryHealth: dto.batteryHealth ?? null,
                costPrice: dto.unitCost.toFixed(2),
                sellingPrice: dto.sellingPrice ? dto.sellingPrice.toFixed(2) : null,
                lastRefType: 'GRN',
                lastRefId: savedGr.id,
            });
            const savedImei = await imeiRepo.save(imeiUnit);
            const grImei = grImeiRepo.create({
                goodsReceiptItemId: savedGrItem.id,
                imeiUnitId: savedImei.id,
            });
            await grImeiRepo.save(grImei);
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
            const movement = movementRepo.create({
                productId: dto.productId,
                imeiUnitId: savedImei.id,
                movementType: movement_type_enum_1.MovementType.IN,
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
    async recordPayment(id, dto, userId) {
        const po = await this.findOne(id);
        if (po.status === po_status_enum_1.PoStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot record payment on a cancelled PO');
        }
        const poTotal = po.items.reduce((sum, i) => sum + parseFloat(i.unitCost || '0') * i.orderedQty, 0);
        const currentPaid = parseFloat(po.paidAmount || '0');
        const paymentAmount = Number(dto.amount);
        const newPaid = currentPaid + paymentAmount;
        po.paidAmount = newPaid.toFixed(2);
        po.paidAt = dto.paymentDate ? new Date(dto.paymentDate) : new Date();
        if (newPaid >= poTotal - 0.01) {
            po.paymentStatus = po_payment_status_enum_1.PoPaymentStatus.PAID;
        }
        else {
            po.paymentStatus = po_payment_status_enum_1.PoPaymentStatus.PARTIALLY_PAID;
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
            statuses: [po_status_enum_1.PoStatus.APPROVED, po_status_enum_1.PoStatus.PARTIALLY_RECEIVED],
        })
            .getCount();
        return {
            monthPeriod: {
                from: firstDayOfMonth,
                to: lastDayOfMonth,
            },
            totalProcurementThisMonth: parseFloat(monthlyRes[0]?.total_procurement_month || '0'),
            newStockOutlayThisMonth: parseFloat(monthlyRes[0]?.new_stock_outlay_month || '0'),
            usedBuybackOutlayThisMonth: parseFloat(monthlyRes[0]?.used_buyback_outlay_month || '0'),
            poCountThisMonth: Number(monthlyRes[0]?.po_count_month || 0),
            outstandingPayables: parseFloat(payablesRes[0]?.outstanding_payables || '0'),
            overduePayables: parseFloat(payablesRes[0]?.overdue_payables || '0'),
            overdueCount: Number(payablesRes[0]?.overdue_count || 0),
            pendingGoodsReceiptCount: pendingGrnCount,
        };
    }
    async generatePoNumber(prefix = 'PO') {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
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
    async generateGrnNumber() {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const todayPrefix = `GRN-${ymd}-`;
        const count = await this.dataSource
            .getRepository(goods_receipt_entity_1.GoodsReceipt)
            .createQueryBuilder('gr')
            .where('gr.grnNumber LIKE :prefix', { prefix: `${todayPrefix}%` })
            .getCount();
        const seq = (count + 1).toString().padStart(3, '0');
        const candidate = `${todayPrefix}${seq}`;
        const exists = await this.dataSource
            .getRepository(goods_receipt_entity_1.GoodsReceipt)
            .findOne({
            where: { grnNumber: candidate },
        });
        if (exists) {
            return `${todayPrefix}${Date.now().toString().slice(-6)}`;
        }
        return candidate;
    }
};
exports.PurchaseOrdersService = PurchaseOrdersService;
exports.PurchaseOrdersService = PurchaseOrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(1, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource,
        audit_logs_service_1.AuditLogsService])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map