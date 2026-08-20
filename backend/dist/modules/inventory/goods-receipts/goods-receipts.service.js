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
exports.GoodsReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const product_entity_1 = require("../../catalog/entities/product.entity");
const imei_status_enum_1 = require("../../../common/enums/imei-status.enum");
const movement_type_enum_1 = require("../../../common/enums/movement-type.enum");
const po_status_enum_1 = require("../../../common/enums/po-status.enum");
const product_type_enum_1 = require("../../../common/enums/product-type.enum");
const pagination_util_1 = require("../../../common/utils/pagination.util");
const goods_receipt_entity_1 = require("../entities/goods-receipt.entity");
const goods_receipt_item_entity_1 = require("../entities/goods-receipt-item.entity");
const goods_receipt_item_imei_entity_1 = require("../entities/goods-receipt-item-imei.entity");
const purchase_order_item_entity_1 = require("../entities/purchase-order-item.entity");
const purchase_order_entity_1 = require("../entities/purchase-order.entity");
const stock_balance_entity_1 = require("../entities/stock-balance.entity");
const stock_movement_entity_1 = require("../entities/stock-movement.entity");
const imei_unit_entity_1 = require("../../imei/entities/imei-unit.entity");
let GoodsReceiptsService = class GoodsReceiptsService {
    constructor(grRepo, poRepo, poItemRepo, productRepo, imeiRepo, dataSource) {
        this.grRepo = grRepo;
        this.poRepo = poRepo;
        this.poItemRepo = poItemRepo;
        this.productRepo = productRepo;
        this.imeiRepo = imeiRepo;
        this.dataSource = dataSource;
    }
    async findAll(query) {
        const qb = this.grRepo.createQueryBuilder('gr');
        if (query.purchaseOrderId) {
            qb.andWhere('gr.purchaseOrderId = :poId', {
                poId: query.purchaseOrderId,
            });
        }
        if (query.dateFrom) {
            qb.andWhere('gr.receiveDate >= :dateFrom', {
                dateFrom: query.dateFrom,
            });
        }
        if (query.dateTo) {
            qb.andWhere('gr.receiveDate <= :dateTo', { dateTo: query.dateTo });
        }
        qb.leftJoinAndSelect('gr.purchaseOrder', 'po')
            .leftJoinAndSelect('gr.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('items.imeis', 'grImeis')
            .leftJoinAndSelect('grImeis.imeiUnit', 'imeiUnit')
            .leftJoinAndSelect('gr.receiver', 'receiver')
            .orderBy('gr.createdAt', 'DESC')
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async findOne(id) {
        const row = await this.grRepo
            .createQueryBuilder('gr')
            .leftJoinAndSelect('gr.purchaseOrder', 'po')
            .leftJoinAndSelect('po.supplier', 'supplier')
            .leftJoinAndSelect('gr.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('items.imeis', 'grImeis')
            .leftJoinAndSelect('grImeis.imeiUnit', 'imeiUnit')
            .leftJoinAndSelect('gr.receiver', 'receiver')
            .where('gr.id = :id', { id })
            .getOne();
        if (!row) {
            throw new common_1.NotFoundException('Goods receipt not found');
        }
        return row;
    }
    async create(dto, userId) {
        const po = await this.poRepo.findOne({
            where: { id: dto.purchaseOrderId },
            relations: ['items', 'items.product'],
        });
        if (!po) {
            throw new common_1.BadRequestException('Purchase order not found');
        }
        if (po.status === po_status_enum_1.PoStatus.CANCELLED ||
            po.status === po_status_enum_1.PoStatus.DRAFT ||
            po.status === po_status_enum_1.PoStatus.REJECTED) {
            throw new common_1.BadRequestException(`Cannot receive against PO with status ${po.status}`);
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Goods receipt must have at least one item');
        }
        for (const dtoItem of dto.items) {
            const poItem = po.items.find((i) => Number(i.id) === Number(dtoItem.poItemId));
            if (!poItem) {
                throw new common_1.BadRequestException(`PO item ${dtoItem.poItemId} does not belong to PO ${po.poNumber}`);
            }
            const outstanding = poItem.orderedQty - poItem.receivedQty;
            if (dtoItem.receivedQty > outstanding) {
                throw new common_1.BadRequestException(`Received qty ${dtoItem.receivedQty} exceeds outstanding qty ${outstanding} for PO item ${dtoItem.poItemId}`);
            }
            const product = poItem.product;
            if (product.productType === product_type_enum_1.ProductType.SERIALIZED) {
                if (!dtoItem.imeis || dtoItem.imeis.length !== dtoItem.receivedQty) {
                    throw new common_1.BadRequestException(`Serialized product ${product.sku} requires exactly ${dtoItem.receivedQty} IMEI(s), got ${dtoItem.imeis?.length ?? 0}`);
                }
            }
            else if (dtoItem.imeis && dtoItem.imeis.length > 0) {
                throw new common_1.BadRequestException(`Non-serialized product ${product.sku} should not have IMEIs`);
            }
            if (dtoItem.imeis) {
                const uniqueImeis = new Set(dtoItem.imeis);
                if (uniqueImeis.size !== dtoItem.imeis.length) {
                    throw new common_1.BadRequestException(`Duplicate IMEIs in payload for product ${product.sku}`);
                }
            }
        }
        const grnNumber = await this.generateGrnNumber();
        const savedGrId = await this.dataSource.transaction(async (manager) => {
            const grRepo = manager.getRepository(goods_receipt_entity_1.GoodsReceipt);
            const grItemRepo = manager.getRepository(goods_receipt_item_entity_1.GoodsReceiptItem);
            const grImeiRepo = manager.getRepository(goods_receipt_item_imei_entity_1.GoodsReceiptItemImei);
            const imeiRepo = manager.getRepository(imei_unit_entity_1.ImeiUnit);
            const poItemRepoTx = manager.getRepository(purchase_order_item_entity_1.PurchaseOrderItem);
            const poRepoTx = manager.getRepository(purchase_order_entity_1.PurchaseOrder);
            const movementRepo = manager.getRepository(stock_movement_entity_1.StockMovement);
            const balanceRepo = manager.getRepository(stock_balance_entity_1.StockBalance);
            const gr = grRepo.create({
                grnNumber,
                purchaseOrderId: dto.purchaseOrderId,
                receiveDate: new Date(dto.receiveDate),
                receivedBy: userId,
                notes: dto.notes ?? null,
                supplierDoNumber: dto.supplierDoNumber ?? null,
                carrierName: dto.carrierName ?? null,
                trackingNumber: dto.trackingNumber ?? null,
            });
            const savedGr = await grRepo.save(gr);
            let fullyReceived = true;
            for (const dtoItem of dto.items) {
                const poItem = po.items.find((i) => Number(i.id) === Number(dtoItem.poItemId));
                const effectiveCost = dtoItem.actualUnitCost !== undefined && dtoItem.actualUnitCost !== null
                    ? dtoItem.actualUnitCost
                    : dtoItem.unitCost;
                const grItem = grItemRepo.create({
                    goodsReceiptId: savedGr.id,
                    poItemId: dtoItem.poItemId,
                    productId: dtoItem.productId,
                    receivedQty: dtoItem.receivedQty,
                    unitCost: dtoItem.unitCost.toFixed(2),
                    actualUnitCost: dtoItem.actualUnitCost !== undefined && dtoItem.actualUnitCost !== null
                        ? dtoItem.actualUnitCost.toFixed(2)
                        : null,
                    conditionStatus: dtoItem.conditionStatus || 'GOOD',
                    conditionNotes: dtoItem.conditionNotes ?? null,
                });
                const savedGrItem = await grItemRepo.save(grItem);
                if (dtoItem.imeis && dtoItem.imeis.length > 0) {
                    for (const imeiStr of dtoItem.imeis) {
                        const existing = await imeiRepo.findOne({
                            where: { imei: imeiStr },
                        });
                        if (existing) {
                            throw new common_1.ConflictException(`IMEI ${imeiStr} already exists in the system`);
                        }
                        const imeiUnit = imeiRepo.create({
                            imei: imeiStr,
                            productId: dtoItem.productId,
                            status: imei_status_enum_1.ImeiStatus.IN_STOCK,
                            currentLocation: 'STORE',
                            lastRefType: 'GRN',
                            lastRefId: savedGr.id,
                        });
                        const savedImei = await imeiRepo.save(imeiUnit);
                        const grImei = grImeiRepo.create({
                            goodsReceiptItemId: savedGrItem.id,
                            imeiUnitId: savedImei.id,
                        });
                        await grImeiRepo.save(grImei);
                        const movement = movementRepo.create({
                            productId: dtoItem.productId,
                            imeiUnitId: savedImei.id,
                            movementType: movement_type_enum_1.MovementType.IN,
                            qty: 1,
                            unitCost: effectiveCost.toFixed(2),
                            refType: 'GRN',
                            refId: savedGr.id,
                            createdBy: userId,
                            notes: `Received via ${grnNumber}${dtoItem.conditionStatus && dtoItem.conditionStatus !== 'GOOD' ? ` (${dtoItem.conditionStatus})` : ''}`,
                        });
                        await movementRepo.save(movement);
                    }
                }
                else {
                    const movement = movementRepo.create({
                        productId: dtoItem.productId,
                        imeiUnitId: null,
                        movementType: movement_type_enum_1.MovementType.IN,
                        qty: dtoItem.receivedQty,
                        unitCost: effectiveCost.toFixed(2),
                        refType: 'GRN',
                        refId: savedGr.id,
                        createdBy: userId,
                        notes: `Received via ${grnNumber}${dtoItem.conditionStatus && dtoItem.conditionStatus !== 'GOOD' ? ` (${dtoItem.conditionStatus})` : ''}`,
                    });
                    await movementRepo.save(movement);
                }
                poItem.receivedQty += dtoItem.receivedQty;
                await poItemRepoTx.save(poItem);
                if (poItem.receivedQty < poItem.orderedQty) {
                    fullyReceived = false;
                }
                let balance = await balanceRepo.findOne({
                    where: { productId: dtoItem.productId },
                });
                if (!balance) {
                    balance = balanceRepo.create({
                        productId: dtoItem.productId,
                        onHandQty: 0,
                        reservedQty: 0,
                    });
                }
                balance.onHandQty += dtoItem.receivedQty;
                await balanceRepo.save(balance);
            }
            if (fullyReceived) {
                po.status = po_status_enum_1.PoStatus.COMPLETED;
            }
            else {
                po.status = po_status_enum_1.PoStatus.PARTIALLY_RECEIVED;
            }
            await poRepoTx.save(po);
            return savedGr.id;
        });
        return this.findOne(Number(savedGrId));
    }
    async generateGrnNumber() {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const todayPrefix = `GRN-${ymd}-`;
        const count = await this.grRepo
            .createQueryBuilder('gr')
            .where('gr.grnNumber LIKE :prefix', { prefix: `${todayPrefix}%` })
            .getCount();
        const seq = (count + 1).toString().padStart(3, '0');
        const candidate = `${todayPrefix}${seq}`;
        const exists = await this.grRepo.findOne({
            where: { grnNumber: candidate },
        });
        if (exists) {
            return `${todayPrefix}${Date.now().toString().slice(-6)}`;
        }
        return candidate;
    }
};
exports.GoodsReceiptsService = GoodsReceiptsService;
exports.GoodsReceiptsService = GoodsReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(goods_receipt_entity_1.GoodsReceipt)),
    __param(1, (0, typeorm_1.InjectRepository)(purchase_order_entity_1.PurchaseOrder)),
    __param(2, (0, typeorm_1.InjectRepository)(purchase_order_item_entity_1.PurchaseOrderItem)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(4, (0, typeorm_1.InjectRepository)(imei_unit_entity_1.ImeiUnit)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.DataSource])
], GoodsReceiptsService);
//# sourceMappingURL=goods-receipts.service.js.map