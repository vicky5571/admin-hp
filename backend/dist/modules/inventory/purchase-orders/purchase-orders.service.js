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
const po_status_enum_1 = require("../../../common/enums/po-status.enum");
const pagination_util_1 = require("../../../common/utils/pagination.util");
const purchase_order_entity_1 = require("../entities/purchase-order.entity");
const purchase_order_item_entity_1 = require("../entities/purchase-order-item.entity");
const supplier_entity_1 = require("../entities/supplier.entity");
const goods_receipt_entity_1 = require("../entities/goods-receipt.entity");
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
        const supplier = await this.supplierRepo.findOne({
            where: { id: dto.supplierId },
        });
        if (!supplier) {
            throw new common_1.BadRequestException('Supplier not found');
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
        const po = this.poRepo.create({
            poNumber,
            supplierId: dto.supplierId,
            status: po_status_enum_1.PoStatus.DRAFT,
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
                supplierName: supplier.name,
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
        const supplier = await this.supplierRepo.findOne({
            where: { id: dto.supplierId },
        });
        if (!supplier) {
            throw new common_1.BadRequestException('Supplier not found');
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('PO must have at least one item');
        }
        await this.dataSource.transaction(async (manager) => {
            const poItemRepo = manager.getRepository(purchase_order_item_entity_1.PurchaseOrderItem);
            const poRepoTx = manager.getRepository(purchase_order_entity_1.PurchaseOrder);
            await poItemRepo.delete({ purchaseOrderId: id });
            const newItems = dto.items.map((i) => poItemRepo.create({
                purchaseOrderId: id,
                productId: i.productId,
                orderedQty: i.orderedQty,
                receivedQty: 0,
                unitCost: i.unitCost.toFixed(2),
            }));
            await poItemRepo.save(newItems);
            po.supplierId = dto.supplierId;
            po.orderDate = dto.orderDate;
            po.expectedDate = dto.expectedDate ?? null;
            po.notes = dto.notes ?? null;
            if (po.status === po_status_enum_1.PoStatus.REJECTED) {
                po.status = po_status_enum_1.PoStatus.DRAFT;
            }
            await poRepoTx.save(po);
        });
        await this.auditLogsService.log({
            userId,
            action: 'PO_UPDATED',
            entityType: 'PURCHASE_ORDER',
            entityId: Number(id),
            metadataJson: { poNumber: po.poNumber, itemsCount: dto.items.length },
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
    async generatePoNumber() {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const todayPrefix = `PO-${ymd}-`;
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