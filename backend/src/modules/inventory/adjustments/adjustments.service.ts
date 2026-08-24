import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { MovementType } from '../../../common/enums/movement-type.enum';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { Product } from '../../catalog/entities/product.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';
import { StockBalance } from '../entities/stock-balance.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
import {
  AdjustmentType,
  CreateStockAdjustmentDto,
} from './dto/create-stock-adjustment.dto';
import { ListAdjustmentsQueryDto } from './dto/list-adjustments.query.dto';

const INCREASE_TYPES: AdjustmentType[] = [
  AdjustmentType.COUNT_VARIANCE_IN,
  AdjustmentType.FOUND_STOCK,
  AdjustmentType.CORRECTION_IN,
];

@Injectable()
export class AdjustmentsService {
  constructor(
    @InjectRepository(StockMovement)
    private readonly movementRepo: Repository<StockMovement>,
    @InjectRepository(StockBalance)
    private readonly stockBalanceRepo: Repository<StockBalance>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ImeiUnit)
    private readonly imeiRepo: Repository<ImeiUnit>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async create(dto: CreateStockAdjustmentDto, userId: number) {
    const isIncrease = INCREASE_TYPES.includes(dto.adjustmentType);

    const result = await this.dataSource.transaction(async (manager) => {
      // 1. Fetch Product
      const product = await manager.findOne(Product, {
        where: { id: dto.productId },
      });
      if (!product) {
        throw new NotFoundException(`Product ID ${dto.productId} not found`);
      }

      // 2. Lock Stock Balance
      let stock = await manager.findOne(StockBalance, {
        where: { productId: dto.productId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!stock) {
        stock = manager.create(StockBalance, {
          productId: dto.productId,
          onHandQty: 0,
          reservedQty: 0,
        });
      }

      const oldQty = Number(stock.onHandQty) || 0;
      const newQty = isIncrease ? oldQty + dto.qty : oldQty - dto.qty;

      if (newQty < 0) {
        throw new BadRequestException(
          `Insufficient stock balance. Current on-hand is ${oldQty}, cannot deduct ${dto.qty}.`,
        );
      }

      stock.onHandQty = newQty;
      await manager.save(StockBalance, stock);

      // 3. Serialized IMEI handling
      const serializedMovements: StockMovement[] = [];
      if (product.productType === 'SERIALIZED' && dto.imeiUnitIds && dto.imeiUnitIds.length > 0) {
        const units = await manager.find(ImeiUnit, {
          where: { id: In(dto.imeiUnitIds), productId: dto.productId },
        });

        if (units.length !== dto.imeiUnitIds.length) {
          throw new BadRequestException(
            `Some selected IMEI units could not be found or do not belong to this product.`,
          );
        }

        for (const unit of units) {
          if (dto.adjustmentType === AdjustmentType.DAMAGE) {
            unit.status = ImeiStatus.DEFECTIVE;
            unit.lastRefType = 'STOCK_ADJUSTMENT';
          } else if (
            dto.adjustmentType === AdjustmentType.SHRINKAGE ||
            dto.adjustmentType === AdjustmentType.COUNT_VARIANCE_OUT ||
            dto.adjustmentType === AdjustmentType.CORRECTION_OUT
          ) {
            unit.status = ImeiStatus.DEFECTIVE;
            unit.lastRefType = 'STOCK_ADJUSTMENT';
          } else if (isIncrease) {
            unit.status = ImeiStatus.IN_STOCK;
            unit.lastRefType = 'STOCK_ADJUSTMENT';
          }
          await manager.save(ImeiUnit, unit);

          // Individual IMEI movement line
          const imeiMv = manager.create(StockMovement, {
            productId: dto.productId,
            imeiUnitId: unit.id,
            movementType: isIncrease ? MovementType.ADJUST_IN : MovementType.ADJUST_OUT,
            qty: isIncrease ? 1 : -1,
            unitCost: product.costPrice,
            refType: 'STOCK_ADJUSTMENT',
            refId: 0,
            reasonCode: `${dto.adjustmentType}: ${dto.reason}`,
            notes: dto.notes || null,
            createdBy: userId,
          });
          serializedMovements.push(imeiMv);
        }
      }

      // 4. Create primary Stock Movement
      const movement = manager.create(StockMovement, {
        productId: dto.productId,
        movementType: isIncrease ? MovementType.ADJUST_IN : MovementType.ADJUST_OUT,
        qty: isIncrease ? dto.qty : -dto.qty,
        unitCost: product.costPrice,
        refType: 'STOCK_ADJUSTMENT',
        refId: 0,
        reasonCode: `${dto.adjustmentType}: ${dto.reason}`,
        notes: dto.notes || null,
        createdBy: userId,
      });

      const savedMovement = await manager.save(StockMovement, movement);

      if (serializedMovements.length > 0) {
        for (const sm of serializedMovements) {
          sm.refId = savedMovement.id;
        }
        await manager.save(StockMovement, serializedMovements);
      }

      return {
        movement: savedMovement,
        product,
        oldQty,
        newQty,
      };
    });

    // 5. Audit Log
    try {
      await this.auditLogsService.log({
        userId,
        action: 'STOCK_ADJUSTMENT',
        entityType: 'StockBalance',
        entityId: dto.productId,
        metadataJson: {
          productId: dto.productId,
          productName: result.product.name,
          sku: result.product.sku,
          adjustmentType: dto.adjustmentType,
          qtyDelta: isIncrease ? dto.qty : -dto.qty,
          oldQty: result.oldQty,
          newQty: result.newQty,
          reason: dto.reason,
          notes: dto.notes,
        },
      });
    } catch {
      // non-blocking
    }

    return {
      success: true,
      message: `Stock successfully adjusted for ${result.product.name}. New on-hand: ${result.newQty}.`,
      data: {
        movementId: result.movement.id,
        productId: result.product.id,
        sku: result.product.sku,
        name: result.product.name,
        oldQty: result.oldQty,
        newQty: result.newQty,
        adjustmentType: dto.adjustmentType,
        adjustedAt: result.movement.movementTime,
      },
    };
  }

  async findAll(query: ListAdjustmentsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.movementRepo
      .createQueryBuilder('sm')
      .leftJoinAndSelect('sm.product', 'p')
      .leftJoinAndSelect('sm.creator', 'u')
      .leftJoinAndSelect('sm.imeiUnit', 'iu')
      .where("sm.refType = 'STOCK_ADJUSTMENT'");

    if (query.productId) {
      qb.andWhere('sm.productId = :productId', { productId: query.productId });
    }

    if (query.dateFrom) {
      qb.andWhere('sm.movementTime >= :dateFrom', { dateFrom: query.dateFrom });
    }

    if (query.dateTo) {
      qb.andWhere('sm.movementTime <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('sm.movementTime', 'DESC');
    qb.skip(skip).take(limit);

    const [items, total] = await qb.getManyAndCount();

    return {
      data: items,
      meta: paginateMeta(page, limit, total),
    };
  }
}
