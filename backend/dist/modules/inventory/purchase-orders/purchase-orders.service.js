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
let PurchaseOrdersService = class PurchaseOrdersService {
    constructor(poRepo, supplierRepo, dataSource) {
        this.poRepo = poRepo;
        this.supplierRepo = supplierRepo;
        this.dataSource = dataSource;
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
        return this.poRepo.save(po);
    }
    async submit(id) {
        const po = await this.findOne(id);
        if (po.status !== po_status_enum_1.PoStatus.DRAFT) {
            throw new common_1.BadRequestException(`Cannot submit PO with status ${po.status}`);
        }
        po.status = po_status_enum_1.PoStatus.SUBMITTED;
        return this.poRepo.save(po);
    }
    async cancel(id) {
        const po = await this.findOne(id);
        if (po.status === po_status_enum_1.PoStatus.COMPLETED ||
            po.status === po_status_enum_1.PoStatus.CANCELLED) {
            throw new common_1.BadRequestException(`Cannot cancel PO with status ${po.status}`);
        }
        po.status = po_status_enum_1.PoStatus.CANCELLED;
        return this.poRepo.save(po);
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
        typeorm_2.DataSource])
], PurchaseOrdersService);
//# sourceMappingURL=purchase-orders.service.js.map