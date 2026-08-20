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
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const imei_status_enum_1 = require("../../common/enums/imei-status.enum");
const movement_type_enum_1 = require("../../common/enums/movement-type.enum");
const product_type_enum_1 = require("../../common/enums/product-type.enum");
const restock_type_enum_1 = require("../../common/enums/restock-type.enum");
const return_status_enum_1 = require("../../common/enums/return-status.enum");
const sale_status_enum_1 = require("../../common/enums/sale-status.enum");
const pagination_util_1 = require("../../common/utils/pagination.util");
const product_entity_1 = require("../catalog/entities/product.entity");
const imei_unit_entity_1 = require("../imei/entities/imei-unit.entity");
const stock_balance_entity_1 = require("../inventory/entities/stock-balance.entity");
const stock_movement_entity_1 = require("../inventory/entities/stock-movement.entity");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const return_item_imei_entity_1 = require("./entities/return-item-imei.entity");
const return_item_entity_1 = require("./entities/return-item.entity");
const return_entity_1 = require("./entities/return.entity");
const sale_entity_1 = require("./entities/sale.entity");
let ReturnsService = class ReturnsService {
    constructor(dataSource, returnsRepo, salesRepo, productRepo, imeiRepo, auditLogsService) {
        this.dataSource = dataSource;
        this.returnsRepo = returnsRepo;
        this.salesRepo = salesRepo;
        this.productRepo = productRepo;
        this.imeiRepo = imeiRepo;
        this.auditLogsService = auditLogsService;
    }
    async validate(dto) {
        const sale = await this.salesRepo.findOne({
            where: { invoiceNumber: dto.invoiceNumber },
            relations: ['items', 'items.imeis', 'items.imeis.imeiUnit'],
        });
        if (!sale) {
            throw new common_1.NotFoundException('Sale not found');
        }
        if (sale.status !== sale_status_enum_1.SaleStatus.COMPLETED) {
            throw new common_1.BadRequestException(`Sale status ${sale.status} is not eligible for returns`);
        }
        const results = [];
        for (const dtoItem of dto.items) {
            const saleItem = sale.items.find((i) => i.id === dtoItem.saleItemId);
            if (!saleItem) {
                results.push({
                    saleItemId: dtoItem.saleItemId,
                    eligible: false,
                    maxRefundable: 0,
                    reason: 'Sale item does not belong to this sale',
                });
                continue;
            }
            if (dtoItem.qty > saleItem.qty) {
                results.push({
                    saleItemId: dtoItem.saleItemId,
                    eligible: false,
                    maxRefundable: 0,
                    reason: `Return qty ${dtoItem.qty} exceeds purchased qty ${saleItem.qty}`,
                });
                continue;
            }
            const product = await this.productRepo.findOne({
                where: { id: saleItem.productId },
            });
            if (product?.productType === product_type_enum_1.ProductType.SERIALIZED) {
                if (!dtoItem.imeis || dtoItem.imeis.length !== dtoItem.qty) {
                    results.push({
                        saleItemId: dtoItem.saleItemId,
                        eligible: false,
                        maxRefundable: 0,
                        reason: 'Serialized item requires IMEI for each returned unit',
                    });
                    continue;
                }
                for (const imeiStr of dtoItem.imeis) {
                    const imei = await this.imeiRepo.findOne({
                        where: { imei: imeiStr },
                    });
                    if (!imei) {
                        results.push({
                            saleItemId: dtoItem.saleItemId,
                            eligible: false,
                            maxRefundable: 0,
                            reason: `IMEI ${imeiStr} not found`,
                        });
                        break;
                    }
                    if (imei.status !== imei_status_enum_1.ImeiStatus.SOLD) {
                        results.push({
                            saleItemId: dtoItem.saleItemId,
                            eligible: false,
                            maxRefundable: 0,
                            reason: `IMEI ${imeiStr} status is ${imei.status}, not SOLD`,
                        });
                        break;
                    }
                    const belongsToSale = saleItem.imeis?.some((sii) => sii.imeiUnitId === imei.id);
                    if (!belongsToSale) {
                        results.push({
                            saleItemId: dtoItem.saleItemId,
                            eligible: false,
                            maxRefundable: 0,
                            reason: `IMEI ${imeiStr} does not belong to this sale item`,
                        });
                        break;
                    }
                }
            }
            const maxRefundable = parseFloat(saleItem.unitPrice) * dtoItem.qty -
                parseFloat(saleItem.discountAmount);
            results.push({
                saleItemId: dtoItem.saleItemId,
                eligible: true,
                maxRefundable: Math.max(maxRefundable, 0),
            });
        }
        return {
            invoiceNumber: sale.invoiceNumber,
            saleId: sale.id,
            saleStatus: sale.status,
            items: results,
        };
    }
    async create(dto, user) {
        const sale = await this.salesRepo.findOne({
            where: { id: dto.saleId },
            relations: ['items', 'items.imeis', 'items.imeis.imeiUnit', 'items.product'],
        });
        if (!sale) {
            throw new common_1.NotFoundException('Sale not found');
        }
        if (sale.status !== sale_status_enum_1.SaleStatus.COMPLETED) {
            throw new common_1.BadRequestException(`Sale status ${sale.status} is not eligible for returns`);
        }
        if (!dto.items || dto.items.length === 0) {
            throw new common_1.BadRequestException('Return must have at least one item');
        }
        for (const dtoItem of dto.items) {
            const saleItem = sale.items.find((i) => i.id === dtoItem.saleItemId);
            if (!saleItem) {
                throw new common_1.BadRequestException(`Sale item ${dtoItem.saleItemId} does not belong to sale ${sale.invoiceNumber}`);
            }
            if (dtoItem.qty > saleItem.qty) {
                throw new common_1.BadRequestException(`Return qty ${dtoItem.qty} exceeds purchased qty ${saleItem.qty} for sale item ${dtoItem.saleItemId}`);
            }
            const product = saleItem.product;
            if (product.productType === product_type_enum_1.ProductType.SERIALIZED) {
                if (!dtoItem.imeis || dtoItem.imeis.length !== dtoItem.qty) {
                    throw new common_1.BadRequestException(`Serialized product ${product.sku} requires ${dtoItem.qty} IMEI(s)`);
                }
                for (const imeiStr of dtoItem.imeis) {
                    const imei = await this.imeiRepo.findOne({
                        where: { imei: imeiStr },
                    });
                    if (!imei) {
                        throw new common_1.NotFoundException(`IMEI ${imeiStr} not found`);
                    }
                    if (imei.status !== imei_status_enum_1.ImeiStatus.SOLD) {
                        throw new common_1.ConflictException(`IMEI ${imeiStr} status is ${imei.status}, not SOLD`);
                    }
                    const belongsToSale = saleItem.imeis?.some((sii) => sii.imeiUnitId === imei.id);
                    if (!belongsToSale) {
                        throw new common_1.BadRequestException(`IMEI ${imeiStr} does not belong to this sale item`);
                    }
                }
            }
        }
        const refundTotal = dto.items.reduce((acc, i) => acc + i.lineRefundTotal, 0);
        return this.dataSource.transaction(async (manager) => {
            const returnNumber = await this.generateReturnNumber(manager);
            const ret = manager.create(return_entity_1.Return, {
                returnNumber,
                saleId: dto.saleId,
                processedBy: user.id,
                returnTime: new Date(),
                refundTotal: refundTotal.toFixed(2),
                refundMethod: dto.refundMethod,
                status: return_status_enum_1.ReturnStatus.COMPLETED,
                reason: dto.reason,
            });
            const savedReturn = await manager.save(return_entity_1.Return, ret);
            for (const dtoItem of dto.items) {
                const saleItem = sale.items.find((i) => i.id === dtoItem.saleItemId);
                const product = saleItem.product;
                const returnItem = manager.create(return_item_entity_1.ReturnItem, {
                    returnId: savedReturn.id,
                    saleItemId: dtoItem.saleItemId,
                    productId: dtoItem.productId,
                    qty: dtoItem.qty,
                    unitRefund: dtoItem.unitRefund.toFixed(2),
                    lineRefundTotal: dtoItem.lineRefundTotal.toFixed(2),
                    restockType: dtoItem.restockType,
                });
                const savedReturnItem = await manager.save(return_item_entity_1.ReturnItem, returnItem);
                if (dtoItem.imeis && dtoItem.imeis.length > 0) {
                    for (const imeiStr of dtoItem.imeis) {
                        const imei = await manager.findOne(imei_unit_entity_1.ImeiUnit, {
                            where: { imei: imeiStr },
                        });
                        if (dtoItem.restockType === restock_type_enum_1.RestockType.SELLABLE) {
                            imei.status = imei_status_enum_1.ImeiStatus.IN_STOCK;
                        }
                        else {
                            imei.status = imei_status_enum_1.ImeiStatus.DEFECTIVE;
                        }
                        imei.lastRefType = 'RETURN';
                        imei.lastRefId = savedReturn.id;
                        await manager.save(imei_unit_entity_1.ImeiUnit, imei);
                        await manager.save(return_item_imei_entity_1.ReturnItemImei, manager.create(return_item_imei_entity_1.ReturnItemImei, {
                            returnItemId: savedReturnItem.id,
                            imeiUnitId: imei.id,
                        }));
                        const movementType = dtoItem.restockType === restock_type_enum_1.RestockType.SELLABLE
                            ? movement_type_enum_1.MovementType.RETURN_IN
                            : movement_type_enum_1.MovementType.ADJUST_IN;
                        await manager.save(stock_movement_entity_1.StockMovement, manager.create(stock_movement_entity_1.StockMovement, {
                            productId: dtoItem.productId,
                            imeiUnitId: imei.id,
                            movementType,
                            qty: 1,
                            unitCost: product.costPrice,
                            refType: 'RETURN',
                            refId: savedReturn.id,
                            createdBy: user.id,
                            notes: `Return via ${returnNumber}`,
                        }));
                    }
                }
                else {
                    const movementType = dtoItem.restockType === restock_type_enum_1.RestockType.SELLABLE
                        ? movement_type_enum_1.MovementType.RETURN_IN
                        : movement_type_enum_1.MovementType.ADJUST_IN;
                    await manager.save(stock_movement_entity_1.StockMovement, manager.create(stock_movement_entity_1.StockMovement, {
                        productId: dtoItem.productId,
                        imeiUnitId: null,
                        movementType,
                        qty: dtoItem.qty,
                        unitCost: product.costPrice,
                        refType: 'RETURN',
                        refId: savedReturn.id,
                        createdBy: user.id,
                        notes: `Return via ${returnNumber}`,
                    }));
                }
                if (dtoItem.restockType === restock_type_enum_1.RestockType.SELLABLE) {
                    let balance = await manager.findOne(stock_balance_entity_1.StockBalance, {
                        where: { productId: dtoItem.productId },
                    });
                    if (!balance) {
                        balance = manager.create(stock_balance_entity_1.StockBalance, {
                            productId: dtoItem.productId,
                            onHandQty: 0,
                            reservedQty: 0,
                        });
                    }
                    balance.onHandQty += dtoItem.qty;
                    await manager.save(stock_balance_entity_1.StockBalance, balance);
                }
            }
            const totalReturnedQty = dto.items.reduce((acc, i) => acc + i.qty, 0);
            const totalPurchasedQty = sale.items.reduce((acc, i) => acc + i.qty, 0);
            if (totalReturnedQty >= totalPurchasedQty) {
                sale.status = sale_status_enum_1.SaleStatus.REFUNDED;
            }
            else {
                sale.status = sale_status_enum_1.SaleStatus.PARTIALLY_REFUNDED;
            }
            await manager.save(sale_entity_1.Sale, sale);
            return this.findOne(savedReturn.id);
        });
        await this.auditLogsService.log({
            userId: user.id,
            action: 'RETURN_CREATED',
            entityType: 'RETURN',
            entityId: res?.id ? Number(res.id) : null,
            metadataJson: {
                returnNumber: res?.returnNumber,
                invoiceNumber: dto.invoiceNumber,
                refundTotal: dto.refundTotal,
                itemsCount: dto.items.length,
            },
        });
        return res;
    }
    async findAll(query) {
        const qb = this.returnsRepo.createQueryBuilder('r');
        if (query.saleId) {
            qb.andWhere('r.saleId = :saleId', { saleId: query.saleId });
        }
        if (query.status) {
            qb.andWhere('r.status = :status', { status: query.status });
        }
        if (query.dateFrom) {
            qb.andWhere('r.returnTime >= :dateFrom', { dateFrom: query.dateFrom });
        }
        if (query.dateTo) {
            qb.andWhere('r.returnTime <= :dateTo', { dateTo: query.dateTo });
        }
        qb.leftJoinAndSelect('r.sale', 'sale')
            .leftJoinAndSelect('r.processor', 'processor')
            .leftJoinAndSelect('r.items', 'items')
            .leftJoinAndSelect('items.product', 'product')
            .leftJoinAndSelect('items.imeis', 'riImeis')
            .leftJoinAndSelect('riImeis.imeiUnit', 'imeiUnit')
            .orderBy('r.createdAt', 'DESC')
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async findOne(id) {
        const row = await this.returnsRepo.findOne({
            where: { id },
            relations: [
                'sale',
                'processor',
                'items',
                'items.product',
                'items.saleItem',
                'items.imeis',
                'items.imeis.imeiUnit',
            ],
        });
        if (!row) {
            throw new common_1.NotFoundException('Return not found');
        }
        return row;
    }
    async generateReturnNumber(manager) {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, '0') +
            date.getDate().toString().padStart(2, '0');
        const todayPrefix = `RET-${ymd}-`;
        const count = await manager
            .getRepository(return_entity_1.Return)
            .createQueryBuilder('r')
            .where('r.returnNumber LIKE :p', { p: `${todayPrefix}%` })
            .getCount();
        const seq = (count + 1).toString().padStart(4, '0');
        const candidate = `${todayPrefix}${seq}`;
        const exists = await manager
            .getRepository(return_entity_1.Return)
            .findOne({ where: { returnNumber: candidate } });
        if (exists) {
            return `${todayPrefix}${Date.now().toString().slice(-6)}`;
        }
        return candidate;
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(return_entity_1.Return)),
    __param(2, (0, typeorm_1.InjectRepository)(sale_entity_1.Sale)),
    __param(3, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(4, (0, typeorm_1.InjectRepository)(imei_unit_entity_1.ImeiUnit)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_logs_service_1.AuditLogsService])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map