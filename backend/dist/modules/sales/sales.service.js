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
exports.SalesService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const imei_status_enum_1 = require("../../common/enums/imei-status.enum");
const movement_type_enum_1 = require("../../common/enums/movement-type.enum");
const product_type_enum_1 = require("../../common/enums/product-type.enum");
const sale_status_enum_1 = require("../../common/enums/sale-status.enum");
const money_util_1 = require("../../common/utils/money.util");
const pagination_util_1 = require("../../common/utils/pagination.util");
const product_entity_1 = require("../catalog/entities/product.entity");
const imei_unit_entity_1 = require("../imei/entities/imei-unit.entity");
const stock_balance_entity_1 = require("../inventory/entities/stock-balance.entity");
const stock_movement_entity_1 = require("../inventory/entities/stock-movement.entity");
const cashier_shift_entity_1 = require("./entities/cashier-shift.entity");
const customer_entity_1 = require("./entities/customer.entity");
const payment_entity_1 = require("./entities/payment.entity");
const sale_item_imei_entity_1 = require("./entities/sale-item-imei.entity");
const sale_item_entity_1 = require("./entities/sale-item.entity");
const sale_entity_1 = require("./entities/sale.entity");
const pricing_service_1 = require("./pricing.service");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let SalesService = class SalesService {
    constructor(dataSource, salesRepo, productsRepo, imeiRepo, customerRepo, pricingService, auditLogsService) {
        this.dataSource = dataSource;
        this.salesRepo = salesRepo;
        this.productsRepo = productsRepo;
        this.imeiRepo = imeiRepo;
        this.customerRepo = customerRepo;
        this.pricingService = pricingService;
        this.auditLogsService = auditLogsService;
    }
    async create(dto, user) {
        if (dto.idempotencyKey) {
            const existing = await this.salesRepo.findOne({
                where: { idempotencyKey: dto.idempotencyKey },
                relations: [
                    "items",
                    "items.imeis",
                    "items.imeis.imeiUnit",
                    "payments",
                    "cashier",
                    "customer",
                ],
            });
            if (existing) {
                const paidTotal = (0, money_util_1.sumAmounts)(existing.payments?.map((p) => parseFloat(p.amount)) || []);
                const change = Math.max(0, paidTotal - parseFloat(existing.grandTotal || "0"));
                return {
                    ...existing,
                    paidTotal: paidTotal.toFixed(2),
                    change: change.toFixed(2),
                };
            }
        }
        this.pricingService.validateClientTotals(dto);
        const paidTotal = (0, money_util_1.sumAmounts)(dto.payments.map((p) => p.amount));
        if (paidTotal < dto.grandTotal) {
            throw new common_1.BadRequestException("PAYMENT_INSUFFICIENT");
        }
        if (dto.customerId) {
            const customer = await this.customerRepo.findOne({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.BadRequestException("CUSTOMER_NOT_FOUND");
            }
        }
        return this.dataSource.transaction(async (manager) => {
            const invoiceNumber = await this.generateInvoiceNumber(manager);
            let shiftId = dto.shiftId ?? null;
            if (!shiftId) {
                const activeShift = await manager.findOne(cashier_shift_entity_1.CashierShift, {
                    where: { userId: user.id, status: cashier_shift_entity_1.ShiftStatus.OPEN },
                });
                if (activeShift) {
                    shiftId = activeShift.id;
                }
            }
            const sale = manager.create(sale_entity_1.Sale, {
                invoiceNumber,
                saleTime: new Date(),
                cashierId: user.id,
                salesPersonId: dto.salesPersonId ?? user.id,
                customerId: dto.customerId ?? null,
                shiftId,
                idempotencyKey: dto.idempotencyKey ?? null,
                subtotal: dto.subtotal.toFixed(2),
                discountTotal: dto.discountTotal.toFixed(2),
                taxTotal: dto.taxTotal.toFixed(2),
                grandTotal: dto.grandTotal.toFixed(2),
                status: sale_status_enum_1.SaleStatus.COMPLETED,
                notes: dto.notes ?? null,
            });
            const savedSale = await manager.save(sale_entity_1.Sale, sale);
            for (const line of dto.items) {
                const product = await manager.findOne(product_entity_1.Product, {
                    where: { id: line.productId },
                });
                if (!product) {
                    throw new common_1.NotFoundException("Product not found");
                }
                if (product.productType === product_type_enum_1.ProductType.SERIALIZED) {
                    if (!line.imeis || line.imeis.length !== line.qty) {
                        throw new common_1.BadRequestException("SERIALIZED_IMEI_COUNT_MISMATCH");
                    }
                }
                const stock = await manager.findOne(stock_balance_entity_1.StockBalance, {
                    where: { productId: line.productId },
                    lock: { mode: "pessimistic_write" },
                });
                if (!stock || stock.onHandQty < line.qty) {
                    throw new common_1.ConflictException(`STOCK_NOT_ENOUGH for product "${product.name}"`);
                }
                const saleItem = await manager.save(sale_item_entity_1.SaleItem, manager.create(sale_item_entity_1.SaleItem, {
                    saleId: savedSale.id,
                    productId: line.productId,
                    qty: line.qty,
                    unitPrice: line.unitPrice.toFixed(2),
                    discountAmount: line.discountAmount.toFixed(2),
                    taxAmount: line.taxAmount.toFixed(2),
                    lineTotal: line.lineTotal.toFixed(2),
                }));
                stock.onHandQty -= line.qty;
                await manager.save(stock_balance_entity_1.StockBalance, stock);
                await manager.save(stock_movement_entity_1.StockMovement, manager.create(stock_movement_entity_1.StockMovement, {
                    productId: line.productId,
                    movementType: movement_type_enum_1.MovementType.OUT,
                    qty: line.qty,
                    unitCost: product.costPrice,
                    refType: "SALE",
                    refId: savedSale.id,
                    createdBy: user.id,
                    notes: null,
                    imeiUnitId: null,
                }));
                if (product.productType === product_type_enum_1.ProductType.SERIALIZED && line.imeis) {
                    for (const imeiValue of line.imeis) {
                        const imei = await manager.findOne(imei_unit_entity_1.ImeiUnit, {
                            where: { imei: imeiValue, productId: line.productId },
                            lock: { mode: "pessimistic_write" },
                        });
                        if (!imei) {
                            throw new common_1.NotFoundException(`IMEI "${imeiValue}" NOT_FOUND`);
                        }
                        if (imei.status !== imei_status_enum_1.ImeiStatus.IN_STOCK) {
                            throw new common_1.ConflictException(`IMEI "${imeiValue}" is not available (status: ${imei.status})`);
                        }
                        imei.status = imei_status_enum_1.ImeiStatus.SOLD;
                        imei.lastRefType = "SALE";
                        imei.lastRefId = savedSale.id;
                        await manager.save(imei_unit_entity_1.ImeiUnit, imei);
                        await manager.save(sale_item_imei_entity_1.SaleItemImei, manager.create(sale_item_imei_entity_1.SaleItemImei, {
                            saleItemId: saleItem.id,
                            imeiUnitId: imei.id,
                        }));
                    }
                }
            }
            for (const pay of dto.payments) {
                await manager.save(payment_entity_1.Payment, manager.create(payment_entity_1.Payment, {
                    saleId: savedSale.id,
                    method: pay.method,
                    amount: pay.amount.toFixed(2),
                    referenceNo: pay.referenceNo ?? null,
                }));
            }
            if (shiftId) {
                const cashAmount = dto.payments
                    .filter((p) => p.method === "CASH")
                    .reduce((sum, p) => sum + p.amount, 0);
                if (cashAmount > 0) {
                    const shift = await manager.findOne(cashier_shift_entity_1.CashierShift, {
                        where: { id: shiftId },
                        lock: { mode: "pessimistic_write" },
                    });
                    if (shift) {
                        const currentCash = parseFloat(shift.totalCashSales) || 0;
                        const newCash = currentCash + cashAmount;
                        shift.totalCashSales = newCash.toFixed(2);
                        const openBal = parseFloat(shift.openingBalance) || 0;
                        const cashIn = parseFloat(shift.totalCashIn) || 0;
                        const cashOut = parseFloat(shift.totalCashOut) || 0;
                        const refunds = parseFloat(shift.totalCashRefunds) || 0;
                        shift.expectedEndingCash = (openBal +
                            newCash +
                            cashIn -
                            cashOut -
                            refunds).toFixed(2);
                        await manager.save(cashier_shift_entity_1.CashierShift, shift);
                    }
                }
            }
            const result = await manager.findOne(sale_entity_1.Sale, {
                where: { id: savedSale.id },
                relations: [
                    "items",
                    "items.imeis",
                    "items.imeis.imeiUnit",
                    "payments",
                    "cashier",
                    "salesPerson",
                    "customer",
                ],
            });
            const change = paidTotal - dto.grandTotal;
            await this.auditLogsService.log({
                userId: user.id,
                action: "SALE_CREATED",
                entityType: "SALE",
                entityId: result?.id ? Number(result.id) : null,
                metadataJson: {
                    invoiceNumber: result?.invoiceNumber,
                    grandTotal: dto.grandTotal,
                    subtotal: dto.subtotal,
                    itemsCount: dto.items.length,
                    paymentMethods: dto.payments.map((p) => p.method),
                    shiftId,
                    salesPersonId: dto.salesPersonId ?? user.id,
                },
            });
            return {
                ...result,
                paidTotal: paidTotal.toFixed(2),
                change: change.toFixed(2),
            };
        });
    }
    async findAll(query) {
        const qb = this.salesRepo.createQueryBuilder("sale");
        if (query.dateFrom) {
            qb.andWhere("sale.saleTime >= :dateFrom", { dateFrom: query.dateFrom });
        }
        if (query.dateTo) {
            qb.andWhere("sale.saleTime <= :dateTo", { dateTo: query.dateTo });
        }
        if (query.cashierId) {
            qb.andWhere("sale.cashierId = :cashierId", {
                cashierId: query.cashierId,
            });
        }
        if (query.salesPersonId) {
            qb.andWhere("sale.salesPersonId = :salesPersonId", {
                salesPersonId: query.salesPersonId,
            });
        }
        if (query.status) {
            qb.andWhere("sale.status = :status", { status: query.status });
        }
        if (query.invoiceNumber) {
            qb.andWhere("sale.invoiceNumber ILIKE :inv", {
                inv: `%${query.invoiceNumber}%`,
            });
        }
        qb.leftJoinAndSelect("sale.cashier", "cashier")
            .leftJoinAndSelect("sale.salesPerson", "salesPerson")
            .leftJoinAndSelect("sale.customer", "customer")
            .leftJoinAndSelect("sale.items", "items")
            .leftJoinAndSelect("sale.payments", "payments")
            .orderBy("sale.saleTime", "DESC")
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async findOne(id) {
        const row = await this.salesRepo.findOne({
            where: { id },
            relations: [
                "items",
                "items.product",
                "items.imeis",
                "items.imeis.imeiUnit",
                "payments",
                "cashier",
                "salesPerson",
                "customer",
            ],
        });
        if (!row) {
            throw new common_1.NotFoundException("Sale not found");
        }
        return row;
    }
    async voidSale(id, user) {
        const sale = await this.findOne(id);
        if (sale.status === sale_status_enum_1.SaleStatus.VOIDED) {
            throw new common_1.BadRequestException("Sale already voided");
        }
        if (sale.status === sale_status_enum_1.SaleStatus.REFUNDED) {
            throw new common_1.BadRequestException("Cannot void a fully refunded sale");
        }
        return this.dataSource.transaction(async (manager) => {
            for (const item of sale.items) {
                const balance = await manager.findOne(stock_balance_entity_1.StockBalance, {
                    where: { productId: item.productId },
                });
                if (balance) {
                    balance.onHandQty += item.qty;
                    await manager.save(stock_balance_entity_1.StockBalance, balance);
                }
                await manager.save(stock_movement_entity_1.StockMovement, manager.create(stock_movement_entity_1.StockMovement, {
                    productId: item.productId,
                    movementType: movement_type_enum_1.MovementType.ADJUST_IN,
                    qty: item.qty,
                    unitCost: null,
                    refType: "VOID",
                    refId: sale.id,
                    createdBy: user.id,
                    notes: `Void of sale ${sale.invoiceNumber}`,
                    imeiUnitId: null,
                }));
                if (item.imeis && item.imeis.length > 0) {
                    for (const sii of item.imeis) {
                        const imei = await manager.findOne(imei_unit_entity_1.ImeiUnit, {
                            where: { id: sii.imeiUnitId },
                        });
                        if (imei && imei.status === imei_status_enum_1.ImeiStatus.SOLD) {
                            imei.status = imei_status_enum_1.ImeiStatus.IN_STOCK;
                            imei.lastRefType = "VOID";
                            imei.lastRefId = sale.id;
                            await manager.save(imei_unit_entity_1.ImeiUnit, imei);
                        }
                    }
                }
            }
            sale.status = sale_status_enum_1.SaleStatus.VOIDED;
            const voidedSale = await manager.save(sale_entity_1.Sale, sale);
            await this.auditLogsService.log({
                userId: user.id,
                action: "SALE_VOIDED",
                entityType: "SALE",
                entityId: Number(sale.id),
                metadataJson: {
                    invoiceNumber: sale.invoiceNumber,
                    grandTotal: sale.grandTotal,
                },
            });
            return voidedSale;
        });
    }
    async lookupWarranty(rawQuery) {
        const query = rawQuery.trim();
        if (!query) {
            throw new common_1.BadRequestException("Query parameter is required (IMEI or Invoice Number)");
        }
        const imeiUnit = await this.imeiRepo.findOne({
            where: { imei: query },
            relations: ["product", "product.brand", "product.category"],
        });
        let foundSale = null;
        let targetImei = imeiUnit;
        let targetItem = null;
        if (imeiUnit) {
            const saleItemImei = await this.dataSource
                .getRepository(sale_item_imei_entity_1.SaleItemImei)
                .findOne({
                where: { imeiUnitId: imeiUnit.id },
                relations: [
                    "saleItem",
                    "saleItem.sale",
                    "saleItem.sale.customer",
                    "saleItem.sale.cashier",
                    "saleItem.product",
                    "saleItem.product.brand",
                ],
                order: { id: "DESC" },
            });
            if (saleItemImei && saleItemImei.saleItem) {
                foundSale = saleItemImei.saleItem.sale;
                targetItem = saleItemImei.saleItem;
            }
        }
        if (!foundSale) {
            foundSale = await this.salesRepo.findOne({
                where: { invoiceNumber: query },
                relations: [
                    "items",
                    "items.product",
                    "items.product.brand",
                    "items.imeis",
                    "items.imeis.imeiUnit",
                    "customer",
                    "cashier",
                ],
            });
            if (foundSale && foundSale.items?.length > 0) {
                const serializedItem = foundSale.items.find((it) => it.imeis?.length > 0);
                targetItem = serializedItem || foundSale.items[0];
                if (targetItem?.imeis?.length > 0) {
                    targetImei = targetItem.imeis[0].imeiUnit;
                }
            }
        }
        if (!foundSale) {
            throw new common_1.NotFoundException(`No purchase or warranty record found for "${query}"`);
        }
        const isSecondHand = Boolean(targetImei?.conditionGrade && targetImei.conditionGrade !== "NEW");
        const warrantyDays = isSecondHand ? 30 : 365;
        const purchaseDate = new Date(foundSale.saleTime || foundSale.createdAt);
        const expiryDate = new Date(purchaseDate.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
        const now = new Date();
        const isExpired = now > expiryDate;
        const diffTime = expiryDate.getTime() - now.getTime();
        const remainingDays = isExpired
            ? 0
            : Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.max(0, Math.floor((now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24)));
        return {
            verified: true,
            query,
            warranty: {
                status: isExpired ? "EXPIRED" : "ACTIVE",
                warrantyType: isSecondHand
                    ? "30-Day Store Warranty (Second Hand)"
                    : "1-Year Official Brand Warranty (Brand New)",
                warrantyDays,
                purchaseDate: purchaseDate.toISOString(),
                expiryDate: expiryDate.toISOString(),
                remainingDays,
                elapsedDays,
                coveragePercent: Math.min(100, Math.max(0, Math.round((elapsedDays / warrantyDays) * 100))),
            },
            device: {
                productName: targetItem?.product?.name || "Mobile Device",
                brand: targetItem?.product?.brand?.name || "SmartStore Authorized",
                sku: targetItem?.product?.sku || "N/A",
                imei: targetImei?.imei || null,
                conditionGrade: targetImei?.conditionGrade ||
                    (isSecondHand ? "Second Hand" : "Brand New"),
                batteryHealth: targetImei?.batteryHealth || null,
            },
            invoice: {
                id: foundSale.id,
                invoiceNumber: foundSale.invoiceNumber,
                saleTime: foundSale.saleTime || foundSale.createdAt,
                storeBranch: "Central Branch #01",
                cashierName: foundSale.cashier?.fullName ||
                    foundSale.cashier?.username ||
                    "Staff Cashier",
                customerName: foundSale.customer?.name || "Valued Customer",
                customerPhone: foundSale.customer?.phone || null,
            },
            policy: {
                terms: [
                    "Garansi Toko Resmi SmartStore (Mesin & Fungsional).",
                    "Segel garansi toko pada baut/casing wajib dalam kondisi utuh dan tidak rusak.",
                    "Kerusakan akibat kelalaian (jatuh, layar pecah, terkena cairan/air, korsleting) tidak ditanggung garansi.",
                    "Modifikasi sistem operasi (Root, Jailbreak, Custom ROM) membatalkan klaim garansi.",
                    "Wajib menyertakan nota pembelian atau sertifikat garansi digital ini saat klaim.",
                ],
                supportPhone: "+6281234567890",
                supportWhatsApp: "6281234567890",
            },
        };
    }
    async generateInvoiceNumber(manager) {
        const date = new Date();
        const ymd = date.getFullYear().toString() +
            (date.getMonth() + 1).toString().padStart(2, "0") +
            date.getDate().toString().padStart(2, "0");
        const prefix = "INV";
        const todayPrefix = `${prefix}-${ymd}-`;
        const count = await manager
            .getRepository(sale_entity_1.Sale)
            .createQueryBuilder("sale")
            .where("sale.invoiceNumber LIKE :p", { p: `${todayPrefix}%` })
            .getCount();
        const seq = (count + 1).toString().padStart(4, "0");
        const candidate = `${todayPrefix}${seq}`;
        const exists = await manager
            .getRepository(sale_entity_1.Sale)
            .findOne({ where: { invoiceNumber: candidate } });
        if (exists) {
            return `${todayPrefix}${Date.now().toString().slice(-6)}`;
        }
        return candidate;
    }
};
exports.SalesService = SalesService;
exports.SalesService = SalesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectDataSource)()),
    __param(1, (0, typeorm_1.InjectRepository)(sale_entity_1.Sale)),
    __param(2, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(3, (0, typeorm_1.InjectRepository)(imei_unit_entity_1.ImeiUnit)),
    __param(4, (0, typeorm_1.InjectRepository)(customer_entity_1.Customer)),
    __metadata("design:paramtypes", [typeorm_2.DataSource,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        pricing_service_1.PricingService,
        audit_logs_service_1.AuditLogsService])
], SalesService);
//# sourceMappingURL=sales.service.js.map