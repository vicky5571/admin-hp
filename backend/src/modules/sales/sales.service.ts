import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { ImeiStatus } from '../../common/enums/imei-status.enum';
import { MovementType } from '../../common/enums/movement-type.enum';
import { ProductType } from '../../common/enums/product-type.enum';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { sumAmounts } from '../../common/utils/money.util';
import { paginateMeta } from '../../common/utils/pagination.util';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { AuthUser } from '../../common/types/auth-user.type';
import { CreateSaleDto } from './dto/create-sale.dto';
import { ListSalesQueryDto } from './dto/list-sales.query.dto';
import { Customer } from './entities/customer.entity';
import { Payment } from './entities/payment.entity';
import { SaleItemImei } from './entities/sale-item-imei.entity';
import { SaleItem } from './entities/sale-item.entity';
import { Sale } from './entities/sale.entity';
import { PricingService } from './pricing.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

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
    private readonly pricingService: PricingService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateSaleDto, user: AuthUser) {
    this.pricingService.validateClientTotals(dto);

    const paidTotal = sumAmounts(dto.payments.map((p) => p.amount));
    if (paidTotal < dto.grandTotal) {
      throw new BadRequestException('PAYMENT_INSUFFICIENT');
    }

    // Validate customer if provided
    if (dto.customerId) {
      const customer = await this.customerRepo.findOne({
        where: { id: dto.customerId },
      });
      if (!customer) {
        throw new BadRequestException('CUSTOMER_NOT_FOUND');
      }
    }

    return this.dataSource.transaction(async (manager) => {
      const invoiceNumber = await this.generateInvoiceNumber(manager);

      const sale = manager.create(Sale, {
        invoiceNumber,
        saleTime: new Date(),
        cashierId: user.id,
        customerId: dto.customerId ?? null,
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
          throw new NotFoundException('Product not found');
        }

        if (product.productType === ProductType.SERIALIZED) {
          if (!line.imeis || line.imeis.length !== line.qty) {
            throw new BadRequestException('SERIALIZED_IMEI_COUNT_MISMATCH');
          }
        }

        const stock = await manager.findOne(StockBalance, {
          where: { productId: line.productId },
        });

        if (!stock || stock.onHandQty < line.qty) {
          throw new ConflictException('STOCK_NOT_ENOUGH');
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
            refType: 'SALE',
            refId: savedSale.id,
            createdBy: user.id,
            notes: null,
            imeiUnitId: null,
          }),
        );

        if (product.productType === ProductType.SERIALIZED && line.imeis) {
          for (const imeiValue of line.imeis) {
            const imei = await manager.findOne(ImeiUnit, {
              where: { imei: imeiValue, productId: line.productId },
            });
            if (!imei) {
              throw new NotFoundException('IMEI_NOT_FOUND');
            }
            if (imei.status !== ImeiStatus.IN_STOCK) {
              throw new ConflictException('IMEI_NOT_AVAILABLE');
            }

            imei.status = ImeiStatus.SOLD;
            imei.lastRefType = 'SALE';
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

      const result = await manager.findOne(Sale, {
        where: { id: savedSale.id },
        relations: ['items', 'items.imeis', 'items.imeis.imeiUnit', 'payments', 'cashier', 'customer'],
      });

      // Calculate change
      const change = paidTotal - dto.grandTotal;

      await this.auditLogsService.log({
        userId: user.id,
        action: 'SALE_CREATED',
        entityType: 'SALE',
        entityId: result?.id ? Number(result.id) : null,
        metadataJson: {
          invoiceNumber: result?.invoiceNumber,
          grandTotal: dto.grandTotal,
          subtotal: dto.subtotal,
          itemsCount: dto.items.length,
          paymentMethods: dto.payments.map((p) => p.method),
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
    const qb = this.salesRepo.createQueryBuilder('sale');

    if (query.dateFrom) {
      qb.andWhere('sale.saleTime >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('sale.saleTime <= :dateTo', { dateTo: query.dateTo });
    }
    if (query.cashierId) {
      qb.andWhere('sale.cashierId = :cashierId', {
        cashierId: query.cashierId,
      });
    }
    if (query.status) {
      qb.andWhere('sale.status = :status', { status: query.status });
    }
    if (query.invoiceNumber) {
      qb.andWhere('sale.invoiceNumber ILIKE :inv', {
        inv: `%${query.invoiceNumber}%`,
      });
    }

    qb.leftJoinAndSelect('sale.cashier', 'cashier')
      .leftJoinAndSelect('sale.customer', 'customer')
      .leftJoinAndSelect('sale.items', 'items')
      .leftJoinAndSelect('sale.payments', 'payments')
      .orderBy('sale.saleTime', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
    const row = await this.salesRepo.findOne({
      where: { id },
      relations: [
        'items',
        'items.product',
        'items.imeis',
        'items.imeis.imeiUnit',
        'payments',
        'cashier',
        'customer',
      ],
    });
    if (!row) {
      throw new NotFoundException('Sale not found');
    }
    return row;
  }

  async voidSale(id: number, user: AuthUser) {
    const sale = await this.findOne(id);

    if (sale.status === SaleStatus.VOIDED) {
      throw new BadRequestException('Sale already voided');
    }
    if (sale.status === SaleStatus.REFUNDED) {
      throw new BadRequestException('Cannot void a fully refunded sale');
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
            refType: 'VOID',
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
              imei.lastRefType = 'VOID';
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
        action: 'SALE_VOIDED',
        entityType: 'SALE',
        entityId: Number(sale.id),
        metadataJson: {
          invoiceNumber: sale.invoiceNumber,
          grandTotal: sale.grandTotal,
        },
      });

      return voidedSale;
    });
  }

  private async generateInvoiceNumber(manager: import('typeorm').EntityManager): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');

    const prefix = 'INV';
    const todayPrefix = `${prefix}-${ymd}-`;

    const count = await manager
      .getRepository(Sale)
      .createQueryBuilder('sale')
      .where('sale.invoiceNumber LIKE :p', { p: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(4, '0');
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
