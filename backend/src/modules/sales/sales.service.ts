import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectDataSource, InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import { ImeiStatus } from "../../common/enums/imei-status.enum";
import { MovementType } from "../../common/enums/movement-type.enum";
import { ProductType } from "../../common/enums/product-type.enum";
import { RoleName } from "../../common/enums/role.enum";
import { SaleStatus } from "../../common/enums/sale-status.enum";
import { sumAmounts } from "../../common/utils/money.util";
import { paginateMeta } from "../../common/utils/pagination.util";
import { Product } from "../catalog/entities/product.entity";
import { ImeiUnit } from "../imei/entities/imei-unit.entity";
import { StockBalance } from "../inventory/entities/stock-balance.entity";
import { StockMovement } from "../inventory/entities/stock-movement.entity";
import { AuthUser } from "../../common/types/auth-user.type";
import { CreateSaleDto } from "./dto/create-sale.dto";
import { ListSalesQueryDto } from "./dto/list-sales.query.dto";
import { CashierShift, ShiftStatus } from "./entities/cashier-shift.entity";
import { Customer } from "./entities/customer.entity";
import { Payment } from "./entities/payment.entity";
import { SaleItemImei } from "./entities/sale-item-imei.entity";
import { SaleItem } from "./entities/sale-item.entity";
import { Sale } from "./entities/sale.entity";
import { PricingService } from "./pricing.service";
import { AuditLogsService } from "../audit-logs/audit-logs.service";
import { AppSetting } from "../settings/entities/app-setting.entity";

@Injectable()
export class SalesService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(ImeiUnit)
    private readonly imeiRepo: Repository<ImeiUnit>,
    @InjectRepository(Customer)
    private readonly customerRepo: Repository<Customer>,
    @InjectRepository(AppSetting)
    private readonly settingsRepo: Repository<AppSetting>,
    private readonly pricingService: PricingService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateSaleDto, user: AuthUser) {
    // 1. Idempotency check
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
        const paidTotal = sumAmounts(
          existing.payments?.map((p) => parseFloat(p.amount)) || [],
        );
        const change = Math.max(
          0,
          paidTotal - parseFloat(existing.grandTotal || "0"),
        );
        return {
          ...existing,
          paidTotal: paidTotal.toFixed(2),
          change: change.toFixed(2),
        };
      }
    }

    this.pricingService.validateClientTotals(dto);

    const paidTotal = sumAmounts(dto.payments.map((p) => p.amount));
    if (paidTotal < dto.grandTotal) {
      throw new BadRequestException("PAYMENT_INSUFFICIENT");
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new BadRequestException("CUSTOMER_NOT_FOUND");
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const invoiceNumber = await this.generateInvoiceNumber(manager);

      // Find cashier's active shift if available
      let shiftId = dto.shiftId ?? null;
      if (!shiftId) {
        const activeShift = await manager.findOne(CashierShift, {
          where: { userId: user.id, status: ShiftStatus.OPEN },
        });
        if (activeShift) {
          shiftId = activeShift.id;
        }
      }

      const sale = manager.create(Sale, {
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
        status: SaleStatus.COMPLETED,
        notes: dto.notes ?? null,
      });

      const savedSale = await manager.save(Sale, sale);

      for (const line of dto.items) {
        const product = await manager.findOne(Product, {
          where: { id: line.productId },
        });
        if (!product) {
          throw new NotFoundException("Product not found");
        }

        const officialPrice = parseFloat(product.srp || "0");

        if (product.productType === ProductType.SERIALIZED) {
          if (!line.imeis || line.imeis.length !== line.qty) {
            throw new BadRequestException("SERIALIZED_IMEI_COUNT_MISMATCH");
          }
        } else {
          // Validate non-serialized item unit price & discount against catalog SRP
          if (officialPrice > 0) {
            if (line.unitPrice <= 0) {
              throw new BadRequestException(
                `Invalid unit price for product "${product.name}"`,
              );
            }
            const expectedBase = officialPrice * line.qty;
            const actualBilledBase = line.lineTotal - line.taxAmount;
            if (actualBilledBase <= 0) {
              throw new BadRequestException(
                `Billed amount cannot be zero or negative for product "${product.name}"`,
              );
            }
            if (actualBilledBase < expectedBase) {
              const discountRatio =
                (expectedBase - actualBilledBase) / expectedBase;
              if (discountRatio > 0.15 && user.role === RoleName.CASHIER) {
                throw new ForbiddenException(
                  `Price reduction or discount on "${product.name}" exceeds cashier authorization limit (15%) and requires supervisor approval`,
                );
              }
            }
          }
        }

        // Pessimistic write lock to serialize concurrent stock deductions
        const stock = await manager.findOne(StockBalance, {
          where: { productId: line.productId },
          lock: { mode: "pessimistic_write" },
        });

        if (!stock || stock.onHandQty < line.qty) {
          throw new ConflictException(
            `STOCK_NOT_ENOUGH for product "${product.name}"`,
          );
        }

        const saleItem = await manager.save(
          SaleItem,
          manager.create(SaleItem, {
            saleId: savedSale.id,
            productId: line.productId,
            qty: line.qty,
            unitPrice: line.unitPrice.toFixed(2),
            discountAmount: line.discountAmount.toFixed(2),
            taxAmount: line.taxAmount.toFixed(2),
            lineTotal: line.lineTotal.toFixed(2),
          }),
        );

        stock.onHandQty -= line.qty;
        await manager.save(StockBalance, stock);

        await manager.save(
          StockMovement,
          manager.create(StockMovement, {
            productId: line.productId,
            movementType: MovementType.OUT,
            qty: line.qty,
            unitCost: product.costPrice,
            refType: "SALE",
            refId: savedSale.id,
            createdBy: user.id,
            notes: null,
            imeiUnitId: null,
          }),
        );

        if (product.productType === ProductType.SERIALIZED && line.imeis) {
          for (const imeiValue of line.imeis) {
            // Pessimistic write lock on IMEI unit
            const imei = await manager.findOne(ImeiUnit, {
              where: { imei: imeiValue, productId: line.productId },
              lock: { mode: "pessimistic_write" },
            });
            if (!imei) {
              throw new NotFoundException(`IMEI "${imeiValue}" NOT_FOUND`);
            }
            if (imei.status !== ImeiStatus.IN_STOCK) {
              throw new ConflictException(
                `IMEI "${imeiValue}" is not available (status: ${imei.status})`,
              );
            }

            // Validate serialized IMEI selling price
            const unitTargetPrice = imei.sellingPrice
              ? parseFloat(imei.sellingPrice)
              : officialPrice;
            if (unitTargetPrice > 0) {
              if (line.unitPrice <= 0) {
                throw new BadRequestException(
                  `Invalid unit price for IMEI "${imeiValue}"`,
                );
              }
              const actualUnitBase =
                (line.lineTotal - line.taxAmount) / line.qty;
              if (actualUnitBase <= 0) {
                throw new BadRequestException(
                  `Billed amount cannot be zero or negative for IMEI "${imeiValue}"`,
                );
              }
              if (actualUnitBase < unitTargetPrice) {
                const discountRatio =
                  (unitTargetPrice - actualUnitBase) / unitTargetPrice;
                if (discountRatio > 0.15 && user.role === RoleName.CASHIER) {
                  throw new ForbiddenException(
                    `Price reduction or discount on IMEI "${imeiValue}" exceeds cashier authorization limit (15%) and requires supervisor approval`,
                  );
                }
              }
            }

            imei.status = ImeiStatus.SOLD;
            imei.lastRefType = "SALE";
            imei.lastRefId = savedSale.id;
            await manager.save(ImeiUnit, imei);

            await manager.save(
              SaleItemImei,
              manager.create(SaleItemImei, {
                saleItemId: saleItem.id,
                imeiUnitId: imei.id,
              }),
            );
          }
        }
      }

      for (const pay of dto.payments) {
        await manager.save(
          Payment,
          manager.create(Payment, {
            saleId: savedSale.id,
            method: pay.method,
            amount: pay.amount.toFixed(2),
            referenceNo: pay.referenceNo ?? null,
          }),
        );
      }

      // Update shift cash totals in transaction if shift is active
      if (shiftId) {
        const cashAmount = dto.payments
          .filter((p) => p.method === "CASH")
          .reduce((sum, p) => sum + p.amount, 0);

        if (cashAmount > 0) {
          const shift = await manager.findOne(CashierShift, {
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
            shift.expectedEndingCash = (
              openBal +
              newCash +
              cashIn -
              cashOut -
              refunds
            ).toFixed(2);
            await manager.save(CashierShift, shift);
          }
        }
      }

      const result = await manager.findOne(Sale, {
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

      // Calculate change
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

  async findAll(query: ListSalesQueryDto) {
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
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
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
      throw new NotFoundException("Sale not found");
    }
    return row;
  }

  async voidSale(id: number, user: AuthUser) {
    const sale = await this.findOne(id);

    if (sale.status === SaleStatus.VOIDED) {
      throw new BadRequestException("Sale already voided");
    }
    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException("Cannot void a fully refunded sale");
    }

    return this.dataSource.transaction(async (manager) => {
      // Reverse stock for each item
      for (const item of sale.items) {
        // Restore stock balance
        const balance = await manager.findOne(StockBalance, {
          where: { productId: item.productId },
        });
        if (balance) {
          balance.onHandQty += item.qty;
          await manager.save(StockBalance, balance);
        }

        // Reverse stock movement
        await manager.save(
          StockMovement,
          manager.create(StockMovement, {
            productId: item.productId,
            movementType: MovementType.ADJUST_IN,
            qty: item.qty,
            unitCost: null,
            refType: "VOID",
            refId: sale.id,
            createdBy: user.id,
            notes: `Void of sale ${sale.invoiceNumber}`,
            imeiUnitId: null,
          }),
        );

        // Restore IMEI status for serialized items
        if (item.imeis && item.imeis.length > 0) {
          for (const sii of item.imeis) {
            const imei = await manager.findOne(ImeiUnit, {
              where: { id: sii.imeiUnitId },
            });
            if (imei && imei.status === ImeiStatus.SOLD) {
              imei.status = ImeiStatus.IN_STOCK;
              imei.lastRefType = "VOID";
              imei.lastRefId = sale.id;
              await manager.save(ImeiUnit, imei);
            }
          }
        }
      }

      sale.status = SaleStatus.VOIDED;
      const voidedSale = await manager.save(Sale, sale);

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

  async lookupWarranty(rawQuery: string) {
    const query = rawQuery.trim();
    if (!query) {
      throw new BadRequestException(
        "Query parameter is required (IMEI or Invoice Number)",
      );
    }

    // 1. Try to find by IMEI first
    const imeiUnit = await this.imeiRepo.findOne({
      where: { imei: query },
      relations: ["product", "product.brand", "product.category"],
    });

    let foundSale: Sale | null = null;

    if (imeiUnit) {
      const saleItemImei = await this.dataSource
        .getRepository(SaleItemImei)
        .findOne({
          where: { imeiUnitId: imeiUnit.id },
          relations: ["saleItem"],
          order: { id: "DESC" },
        });

      if (saleItemImei?.saleItem) {
        foundSale = await this.salesRepo.findOne({
          where: { id: saleItemImei.saleItem.saleId },
          relations: [
            "items",
            "items.product",
            "items.product.brand",
            "items.product.category",
            "items.imeis",
            "items.imeis.imeiUnit",
            "customer",
            "cashier",
          ],
        });
      }
    }

    // 2. If not found by IMEI, try to find by invoice number
    if (!foundSale) {
      foundSale = await this.salesRepo.findOne({
        where: { invoiceNumber: query },
        relations: [
          "items",
          "items.product",
          "items.product.brand",
          "items.product.category",
          "items.imeis",
          "items.imeis.imeiUnit",
          "customer",
          "cashier",
        ],
      });
    }

    if (!foundSale) {
      throw new NotFoundException(
        `No purchase or warranty record found for "${query}"`,
      );
    }

    const purchaseDate = new Date(foundSale.saleTime || foundSale.createdAt);
    const now = new Date();
    const msPerDay = 1000 * 60 * 60 * 24;
    const elapsedDays = Math.max(
      0,
      Math.floor((now.getTime() - purchaseDate.getTime()) / msPerDay),
    );

    const isSaleVoided = foundSale.status === SaleStatus.VOIDED;
    const isSaleRefunded = foundSale.status === SaleStatus.REFUNDED;

    const devices: Array<{
      productName: string;
      brand: string;
      sku: string;
      imei: string | null;
      conditionGrade: string | null;
      batteryHealth: number | null;
      warrantyDays: number;
      expiryDate: string;
      remainingDays: number;
      coveragePercent: number;
      status: "ACTIVE" | "EXPIRED" | "VOIDED";
      warrantyType: string;
    }> = [];

    // Collect all serialized devices and non-serialized items from sale items
    for (const it of foundSale.items || []) {
      if (it.imeis && it.imeis.length > 0) {
        for (const itImei of it.imeis) {
          const unit = itImei.imeiUnit;
          const policy = this.resolveItemWarranty(it.product, unit);
          const unitWarrantyDays = policy.warrantyDays;
          const unitExpiryDate = new Date(purchaseDate);
          unitExpiryDate.setDate(unitExpiryDate.getDate() + unitWarrantyDays);
          const isUnitExpired = now > unitExpiryDate;
          const unitRemaining = isUnitExpired
            ? 0
            : Math.ceil(
                (unitExpiryDate.getTime() - now.getTime()) / msPerDay,
              );
          const isUnitReturned = Boolean(
            unit && unit.status !== ImeiStatus.SOLD,
          );
          const isUnitVoided = isSaleVoided || isSaleRefunded || isUnitReturned;

          let unitStatus: "ACTIVE" | "EXPIRED" | "VOIDED" = isUnitExpired
            ? "EXPIRED"
            : "ACTIVE";
          let unitWarrantyType = policy.warrantyType;

          if (isUnitVoided) {
            unitStatus = "VOIDED";
            if (isSaleVoided) {
              unitWarrantyType = "Transaksi Dibatalkan (Sale Voided)";
            } else if (isSaleRefunded) {
              unitWarrantyType = "Transaksi Telah Direfund Penuh (Full Refund)";
            } else {
              unitWarrantyType = "Unit Perangkat Telah Diretur / Refund (Voided)";
            }
          }

          devices.push({
            productName: it.product?.name || "Mobile Device",
            brand: it.product?.brand?.name || "SmartStore Authorized",
            sku: it.product?.sku || "N/A",
            imei: unit?.imei || null,
            conditionGrade: policy.conditionGrade,
            batteryHealth: unit?.batteryHealth || null,
            warrantyDays: isUnitVoided ? 0 : unitWarrantyDays,
            expiryDate: isUnitVoided
              ? purchaseDate.toISOString()
              : unitExpiryDate.toISOString(),
            remainingDays: isUnitVoided ? 0 : unitRemaining,
            coveragePercent: isUnitVoided
              ? 0
              : unitWarrantyDays > 0
                ? Math.min(
                    100,
                    Math.max(
                      0,
                      Math.round((elapsedDays / unitWarrantyDays) * 100),
                    ),
                  )
                : 0,
            status: unitStatus,
            warrantyType: unitWarrantyType,
          });
        }
      } else {
        // Non-serialized items (accessories, screen protectors, cables, cases, services)
        const policy = this.resolveItemWarranty(it.product, null);
        const itemWarrantyDays = policy.warrantyDays;
        const itemExpiryDate = new Date(purchaseDate);
        itemExpiryDate.setDate(itemExpiryDate.getDate() + itemWarrantyDays);
        const isItemExpired = now > itemExpiryDate;
        const itemRemaining = isItemExpired
          ? 0
          : Math.ceil(
              (itemExpiryDate.getTime() - now.getTime()) / msPerDay,
            );
        const isItemVoided = isSaleVoided || isSaleRefunded;

        let itemStatus: "ACTIVE" | "EXPIRED" | "VOIDED" = isItemVoided
          ? "VOIDED"
          : isItemExpired
            ? "EXPIRED"
            : "ACTIVE";
        let itemWarrantyType = isItemVoided
          ? "Transaksi Dibatalkan / Direfund"
          : policy.warrantyType;

        devices.push({
          productName: it.product?.name || "Retail Item",
          brand: it.product?.brand?.name || "SmartStore Authorized",
          sku: it.product?.sku || "N/A",
          imei: null,
          conditionGrade: policy.conditionGrade,
          batteryHealth: null,
          warrantyDays: isItemVoided ? 0 : itemWarrantyDays,
          expiryDate: isItemVoided
            ? purchaseDate.toISOString()
            : itemExpiryDate.toISOString(),
          remainingDays: isItemVoided ? 0 : itemRemaining,
          coveragePercent: isItemVoided
            ? 0
            : itemWarrantyDays > 0
              ? Math.min(
                  100,
                  Math.max(
                    0,
                    Math.round((elapsedDays / itemWarrantyDays) * 100),
                  ),
                )
              : 0,
          status: itemStatus,
          warrantyType: itemWarrantyType,
        });
      }
    }

    // Determine primary/focused device
    let primaryIndex = 0;
    if (imeiUnit) {
      const matchIdx = devices.findIndex((d) => d.imei === imeiUnit.imei);
      if (matchIdx !== -1) {
        primaryIndex = matchIdx;
      }
    }

    const primaryDevice = devices[primaryIndex] || {
      productName: "Mobile Device",
      brand: "SmartStore Authorized",
      sku: "N/A",
      imei: null,
      conditionGrade: "Brand New",
      batteryHealth: null,
      warrantyDays: 0,
      expiryDate: purchaseDate.toISOString(),
      remainingDays: 0,
      coveragePercent: 0,
      status: isSaleVoided || isSaleRefunded ? "VOIDED" : "ACTIVE",
      warrantyType: "Standard Warranty",
    };

    const settings = await this.settingsRepo.find();
    const settingsMap = Object.fromEntries(
      settings.map((s) => [s.key, s.value]),
    );
    const storeName = settingsMap.STORE_NAME || "SmartStore";
    const storeBranch = settingsMap.STORE_ADDRESS || "Central Branch #01";
    const storePhone = settingsMap.STORE_PHONE || "+62 812-3456-7890";
    const rawOwnerWa = settingsMap.STORE_OWNER_WHATSAPP || storePhone;
    const supportWhatsApp = rawOwnerWa.replace(/[^0-9]/g, "");

    return {
      verified: primaryDevice.status !== "VOIDED",
      query,
      warranty: {
        status: primaryDevice.status,
        warrantyType: primaryDevice.warrantyType,
        warrantyDays: primaryDevice.warrantyDays,
        purchaseDate: purchaseDate.toISOString(),
        expiryDate: primaryDevice.expiryDate,
        remainingDays: primaryDevice.remainingDays,
        elapsedDays,
        coveragePercent: primaryDevice.coveragePercent,
      },
      device: {
        productName: primaryDevice.productName,
        brand: primaryDevice.brand,
        sku: primaryDevice.sku,
        imei: primaryDevice.imei,
        conditionGrade: primaryDevice.conditionGrade,
        batteryHealth: primaryDevice.batteryHealth,
      },
      devices,
      invoice: {
        invoiceNumber: foundSale.invoiceNumber,
        saleTime: foundSale.saleTime || foundSale.createdAt,
        storeBranch: storeBranch,
        cashierName:
          foundSale.cashier?.fullName ||
          foundSale.cashier?.username ||
          "Staff Cashier",
        customerName: this.maskCustomerName(foundSale.customer?.name),
        customerPhone: this.maskCustomerPhone(foundSale.customer?.phone),
      },
      policy: {
        terms:
          primaryDevice.status === "VOIDED"
            ? [
                "Transaksi pembelian perangkat ini berstatus VOID atau telah dikembalikan (Refund/Retur).",
                "Segala bentuk garansi otomatis dibatalkan / gugur dan tidak dapat diklaim.",
                `Silakan hubungi customer service ${storeName} bila membutuhkan klarifikasi lebih lanjut.`,
              ]
            : [
                `Garansi Toko Resmi ${storeName} (Mesin & Fungsional).`,
                "Segel garansi toko pada baut/casing wajib dalam kondisi utuh dan tidak rusak.",
                "Kerusakan akibat kelalaian (jatuh, layar pecah, terkena cairan/air, korsleting) tidak ditanggung garansi.",
                "Modifikasi sistem operasi (Root, Jailbreak, Custom ROM) membatalkan klaim garansi.",
                "Wajib menyertakan nota pembelian atau sertifikat garansi digital ini saat klaim.",
              ],
        supportPhone: storePhone,
        supportWhatsApp: supportWhatsApp,
      },
    };
  }

  private maskCustomerName(name?: string | null): string {
    if (!name || !name.trim() || name.trim().toLowerCase() === "walk-in customer") {
      return "Valued Customer";
    }
    const words = name.trim().split(/\s+/);
    return words
      .map((w) => {
        if (w.length <= 2) return `${w[0]}*`;
        return `${w[0]}${"*".repeat(Math.min(4, Math.max(2, w.length - 2)))}${w[w.length - 1]}`;
      })
      .join(" ");
  }

  private maskCustomerPhone(phone?: string | null): string | null {
    if (!phone || !phone.trim()) return null;
    const trimmed = phone.trim();
    if (trimmed.length <= 6) {
      return "****";
    }
    return `${trimmed.slice(0, 4)}****${trimmed.slice(-3)}`;
  }

  /**
   * Determine warranty duration and policy description based on product category,
   * product type, and unit condition.
   *
   * Rules:
   * - Explicit product.warrantyDays takes precedence if defined.
   * - Services (e.g. screen protector application, battery replacement): 7 days service guarantee.
   * - Consumables & Protective Accessories (screen protectors, tempered glass, cases, skins): 7 days store warranty.
   * - General Retail Accessories (cables, chargers, adapters, powerbanks, audio): 30 days store warranty.
   * - Smartphones & Serialized Devices:
   *   - Second Hand: 30 days store warranty.
   *   - Brand New: 365 days official brand warranty.
   * - Fallback: 30 days standard store warranty.
   */
  private resolveItemWarranty(
    product?: Product | null,
    unit?: ImeiUnit | null,
  ): {
    warrantyDays: number;
    warrantyType: string;
    conditionGrade: string;
  } {
    // 1. Explicit warrantyDays defined on product
    if (
      product &&
      (product as any).warrantyDays != null &&
      !isNaN(Number((product as any).warrantyDays)) &&
      Number((product as any).warrantyDays) >= 0
    ) {
      const days = Number((product as any).warrantyDays);
      return {
        warrantyDays: days,
        warrantyType: `${days}-Day Product Warranty`,
        conditionGrade:
          unit?.conditionGrade ||
          (product.productType === ProductType.SERVICE
            ? "Service / Repair"
            : "Brand New"),
      };
    }

    const categoryName = (product?.category?.name || "").trim().toLowerCase();
    const productName = (product?.name || "").trim().toLowerCase();
    const productType = product?.productType;
    const isSecondHandUnit = Boolean(
      unit?.conditionGrade && unit.conditionGrade !== "NEW",
    );

    // 2. Services (Repair, installation, screen replacement, testing)
    if (
      categoryName === "services" ||
      categoryName === "jasa" ||
      categoryName === "servis" ||
      productType === ProductType.SERVICE ||
      productName.includes("service") ||
      productName.includes("jasa") ||
      productName.includes("repair")
    ) {
      return {
        warrantyDays: 7,
        warrantyType: "7-Day Service Guarantee (Jasa Servis)",
        conditionGrade: "Service / Repair",
      };
    }

    // 3. Consumable Accessories & Cases (Tempered glass, screen protector, hydrogel, cases, skins)
    const isConsumableOrCover =
      /tempered|hydrogel|screen protector|pelindung|casing|case|skin|pouch/i.test(
        productName,
      );
    if (isConsumableOrCover) {
      return {
        warrantyDays: 7,
        warrantyType: "7-Day Store Warranty (Accessory / Protection)",
        conditionGrade: "New Accessory",
      };
    }

    // 4. Electronic & General Accessories (Chargers, cables, powerbanks, audio, adapters)
    const isAccessory =
      categoryName === "accessories" ||
      categoryName === "aksesoris" ||
      productType === ProductType.NON_SERIALIZED ||
      /cable|kabel|charger|adaptor|adapter|powerbank|power bank|earphone|headphone|headset|tws|speaker/i.test(
        productName,
      );
    if (isAccessory) {
      return {
        warrantyDays: 30,
        warrantyType: "30-Day Store Warranty (Accessory)",
        conditionGrade: "New Accessory",
      };
    }

    // 5. Smartphones & Serialized Devices (Smartphones, Tablets, Smartwatches)
    if (
      categoryName === "smartphones" ||
      categoryName === "handphone" ||
      categoryName === "hp" ||
      categoryName === "phones" ||
      productType === ProductType.SERIALIZED ||
      unit
    ) {
      if (isSecondHandUnit) {
        return {
          warrantyDays: 30,
          warrantyType: "30-Day Store Warranty (Second Hand)",
          conditionGrade: unit?.conditionGrade || "Second Hand",
        };
      }
      return {
        warrantyDays: 365,
        warrantyType: "1-Year Official Brand Warranty (Brand New)",
        conditionGrade: unit?.conditionGrade || "Brand New",
      };
    }

    // 6. Default Fallback
    return {
      warrantyDays: 30,
      warrantyType: "30-Day Standard Store Warranty",
      conditionGrade: "Standard",
    };
  }

  private async generateInvoiceNumber(
    manager: import("typeorm").EntityManager,
  ): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, "0") +
      date.getDate().toString().padStart(2, "0");

    const prefix = "INV";
    const todayPrefix = `${prefix}-${ymd}-`;

    const count = await manager
      .getRepository(Sale)
      .createQueryBuilder("sale")
      .where("sale.invoiceNumber LIKE :p", { p: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(4, "0");
    const candidate = `${todayPrefix}${seq}`;

    const exists = await manager
      .getRepository(Sale)
      .findOne({ where: { invoiceNumber: candidate } });
    if (exists) {
      return `${todayPrefix}${Date.now().toString().slice(-6)}`;
    }
    return candidate;
  }
}
