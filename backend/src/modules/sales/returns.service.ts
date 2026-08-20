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
import { RestockType } from '../../common/enums/restock-type.enum';
import { ReturnStatus } from '../../common/enums/return-status.enum';
import { SaleStatus } from '../../common/enums/sale-status.enum';
import { paginateMeta } from '../../common/utils/pagination.util';
import { Product } from '../catalog/entities/product.entity';
import { ImeiUnit } from '../imei/entities/imei-unit.entity';
import { StockBalance } from '../inventory/entities/stock-balance.entity';
import { StockMovement } from '../inventory/entities/stock-movement.entity';
import { AuthUser } from '../../common/types/auth-user.type';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { CreateReturnDto } from './dto/create-return.dto';
import { ListReturnsQueryDto } from './dto/list-returns.query.dto';
import { ValidateReturnDto } from './dto/validate-return.dto';
import { ReturnItemImei } from './entities/return-item-imei.entity';
import { ReturnItem } from './entities/return-item.entity';
import { Return } from './entities/return.entity';
import { Sale } from './entities/sale.entity';

@Injectable()
export class ReturnsService {
  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @InjectRepository(Return)
    private readonly returnsRepo: Repository<Return>,
    @InjectRepository(Sale)
    private readonly salesRepo: Repository<Sale>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ImeiUnit)
    private readonly imeiRepo: Repository<ImeiUnit>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  /**
   * Validate return eligibility before processing.
   * Checks: sale exists, sale is COMPLETED, items belong to sale,
   * return qty doesn't exceed purchased qty, IMEIs are SOLD and belong to the sale.
   */
  async validate(dto: ValidateReturnDto) {
    const sale = await this.salesRepo.findOne({
      where: { invoiceNumber: dto.invoiceNumber },
      relations: ['items', 'items.imeis', 'items.imeis.imeiUnit'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException(
        `Sale status ${sale.status} is not eligible for returns`,
      );
    }

    const results: Array<{
      saleItemId: number;
      eligible: boolean;
      maxRefundable: number;
      reason?: string;
    }> = [];

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

      // Check qty doesn't exceed purchased
      if (dtoItem.qty > saleItem.qty) {
        results.push({
          saleItemId: dtoItem.saleItemId,
          eligible: false,
          maxRefundable: 0,
          reason: `Return qty ${dtoItem.qty} exceeds purchased qty ${saleItem.qty}`,
        });
        continue;
      }

      // For serialized items, verify IMEIs are SOLD and belong to this sale
      const product = await this.productRepo.findOne({
        where: { id: saleItem.productId },
      });
      if (product?.productType === ProductType.SERIALIZED) {
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
          if (imei.status !== ImeiStatus.SOLD) {
            results.push({
              saleItemId: dtoItem.saleItemId,
              eligible: false,
              maxRefundable: 0,
              reason: `IMEI ${imeiStr} status is ${imei.status}, not SOLD`,
            });
            break;
          }
          // Check this IMEI belongs to this sale item
          const belongsToSale = saleItem.imeis?.some(
            (sii) => sii.imeiUnitId === imei.id,
          );
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

      const maxRefundable =
        parseFloat(saleItem.unitPrice) * dtoItem.qty -
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

  async create(dto: CreateReturnDto, user: AuthUser) {
    const sale = await this.salesRepo.findOne({
      where: { id: dto.saleId },
      relations: ['items', 'items.imeis', 'items.imeis.imeiUnit', 'items.product'],
    });
    if (!sale) {
      throw new NotFoundException('Sale not found');
    }
    if (sale.status !== SaleStatus.COMPLETED) {
      throw new BadRequestException(
        `Sale status ${sale.status} is not eligible for returns`,
      );
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('Return must have at least one item');
    }

    // Pre-validate all items
    for (const dtoItem of dto.items) {
      const saleItem = sale.items.find((i) => i.id === dtoItem.saleItemId);
      if (!saleItem) {
        throw new BadRequestException(
          `Sale item ${dtoItem.saleItemId} does not belong to sale ${sale.invoiceNumber}`,
        );
      }
      if (dtoItem.qty > saleItem.qty) {
        throw new BadRequestException(
          `Return qty ${dtoItem.qty} exceeds purchased qty ${saleItem.qty} for sale item ${dtoItem.saleItemId}`,
        );
      }

      const product = saleItem.product;
      if (product.productType === ProductType.SERIALIZED) {
        if (!dtoItem.imeis || dtoItem.imeis.length !== dtoItem.qty) {
          throw new BadRequestException(
            `Serialized product ${product.sku} requires ${dtoItem.qty} IMEI(s)`,
          );
        }
        // Verify IMEIs belong to this sale and are SOLD
        for (const imeiStr of dtoItem.imeis) {
          const imei = await this.imeiRepo.findOne({
            where: { imei: imeiStr },
          });
          if (!imei) {
            throw new NotFoundException(`IMEI ${imeiStr} not found`);
          }
          if (imei.status !== ImeiStatus.SOLD) {
            throw new ConflictException(
              `IMEI ${imeiStr} status is ${imei.status}, not SOLD`,
            );
          }
          const belongsToSale = saleItem.imeis?.some(
            (sii) => sii.imeiUnitId === imei.id,
          );
          if (!belongsToSale) {
            throw new BadRequestException(
              `IMEI ${imeiStr} does not belong to this sale item`,
            );
          }
        }
      }
    }

    const refundTotal = dto.items.reduce(
      (acc, i) => acc + i.lineRefundTotal,
      0,
    );

    return this.dataSource.transaction(async (manager) => {
      const returnNumber = await this.generateReturnNumber(manager);

      // Create return header
      const ret = manager.create(Return, {
        returnNumber,
        saleId: dto.saleId,
        processedBy: user.id,
        returnTime: new Date(),
        refundTotal: refundTotal.toFixed(2),
        refundMethod: dto.refundMethod,
        status: ReturnStatus.COMPLETED,
        reason: dto.reason,
      });
      const savedReturn = await manager.save(Return, ret);

      for (const dtoItem of dto.items) {
        const saleItem = sale.items.find((i) => i.id === dtoItem.saleItemId)!;
        const product = saleItem.product;

        // Create return item
        const returnItem = manager.create(ReturnItem, {
          returnId: savedReturn.id,
          saleItemId: dtoItem.saleItemId,
          productId: dtoItem.productId,
          qty: dtoItem.qty,
          unitRefund: dtoItem.unitRefund.toFixed(2),
          lineRefundTotal: dtoItem.lineRefundTotal.toFixed(2),
          restockType: dtoItem.restockType,
        });
        const savedReturnItem = await manager.save(ReturnItem, returnItem);

        // Handle IMEIs for serialized items
        if (dtoItem.imeis && dtoItem.imeis.length > 0) {
          for (const imeiStr of dtoItem.imeis) {
            const imei = await manager.findOne(ImeiUnit, {
              where: { imei: imeiStr },
            });

            // Update IMEI status based on restock type
            if (dtoItem.restockType === RestockType.SELLABLE) {
              imei!.status = ImeiStatus.IN_STOCK;
            } else {
              imei!.status = ImeiStatus.DEFECTIVE;
            }
            imei!.lastRefType = 'RETURN';
            imei!.lastRefId = savedReturn.id;
            await manager.save(ImeiUnit, imei!);

            // Link IMEI to return item
            await manager.save(
              ReturnItemImei,
              manager.create(ReturnItemImei, {
                returnItemId: savedReturnItem.id,
                imeiUnitId: imei!.id,
              }),
            );

            // Stock movement for this IMEI
            const movementType =
              dtoItem.restockType === RestockType.SELLABLE
                ? MovementType.RETURN_IN
                : MovementType.ADJUST_IN;

            await manager.save(
              StockMovement,
              manager.create(StockMovement, {
                productId: dtoItem.productId,
                imeiUnitId: imei!.id,
                movementType,
                qty: 1,
                unitCost: product.costPrice,
                refType: 'RETURN',
                refId: savedReturn.id,
                createdBy: user.id,
                notes: `Return via ${returnNumber}`,
              }),
            );
          }
        } else {
          // Non-serialized: single batch movement
          const movementType =
            dtoItem.restockType === RestockType.SELLABLE
              ? MovementType.RETURN_IN
              : MovementType.ADJUST_IN;

          await manager.save(
            StockMovement,
            manager.create(StockMovement, {
              productId: dtoItem.productId,
              imeiUnitId: null,
              movementType,
              qty: dtoItem.qty,
              unitCost: product.costPrice,
              refType: 'RETURN',
              refId: savedReturn.id,
              createdBy: user.id,
              notes: `Return via ${returnNumber}`,
            }),
          );
        }

        // Update stock balance only if sellable
        if (dtoItem.restockType === RestockType.SELLABLE) {
          let balance = await manager.findOne(StockBalance, {
            where: { productId: dtoItem.productId },
          });
          if (!balance) {
            balance = manager.create(StockBalance, {
              productId: dtoItem.productId,
              onHandQty: 0,
              reservedQty: 0,
            });
          }
          balance.onHandQty += dtoItem.qty;
          await manager.save(StockBalance, balance);
        }
        // If DEFECTIVE: stock not added back to sellable on_hand, just tracked via movement
      }

      // Update sale status to PARTIALLY_REFUNDED or REFUNDED
      const totalReturnedQty = dto.items.reduce((acc, i) => acc + i.qty, 0);
      const totalPurchasedQty = sale.items.reduce((acc, i) => acc + i.qty, 0);

      if (totalReturnedQty >= totalPurchasedQty) {
        sale.status = SaleStatus.REFUNDED;
      } else {
        sale.status = SaleStatus.PARTIALLY_REFUNDED;
      }
      await manager.save(Sale, sale);

      const savedReturnResult = await this.findOne(savedReturn.id);

      await this.auditLogsService.log({
        userId: user.id,
        action: 'RETURN_CREATED',
        entityType: 'RETURN',
        entityId: Number(savedReturn.id),
        metadataJson: {
          returnNumber: savedReturn.returnNumber,
          invoiceNumber: sale.invoiceNumber,
          refundTotal,
          itemsCount: dto.items.length,
        },
      });

      return savedReturnResult;
    });
  }

  async findAll(query: ListReturnsQueryDto) {
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
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
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
      throw new NotFoundException('Return not found');
    }
    return row;
  }

  private async generateReturnNumber(
    manager: import('typeorm').EntityManager,
  ): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');

    const todayPrefix = `RET-${ymd}-`;
    const count = await manager
      .getRepository(Return)
      .createQueryBuilder('r')
      .where('r.returnNumber LIKE :p', { p: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(4, '0');
    const candidate = `${todayPrefix}${seq}`;

    const exists = await manager
      .getRepository(Return)
      .findOne({ where: { returnNumber: candidate } });
    if (exists) {
      return `${todayPrefix}${Date.now().toString().slice(-6)}`;
    }
    return candidate;
  }
}
