import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';
import { ImeiStatus } from '../../../common/enums/imei-status.enum';
import { MovementType } from '../../../common/enums/movement-type.enum';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { ProductType } from '../../../common/enums/product-type.enum';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { CreateGoodsReceiptDto } from '../dto/create-goods-receipt.dto';
import { ListGoodsReceiptsQueryDto } from '../dto/list-goods-receipts.query.dto';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { GoodsReceiptItem } from '../entities/goods-receipt-item.entity';
import { GoodsReceiptItemImei } from '../entities/goods-receipt-item-imei.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { StockBalance } from '../entities/stock-balance.entity';
import { StockMovement } from '../entities/stock-movement.entity';
import { ImeiUnit } from '../../imei/entities/imei-unit.entity';

@Injectable()
export class GoodsReceiptsService {
  constructor(
    @InjectRepository(GoodsReceipt)
    private readonly grRepo: Repository<GoodsReceipt>,
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem)
    private readonly poItemRepo: Repository<PurchaseOrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ImeiUnit)
    private readonly imeiRepo: Repository<ImeiUnit>,
    private readonly dataSource: DataSource,
  ) {}

  async findAll(query: ListGoodsReceiptsQueryDto) {
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
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
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
      throw new NotFoundException('Goods receipt not found');
    }
    return row;
  }

  async create(dto: CreateGoodsReceiptDto, userId: number) {
    // Load PO with items + products
    const po = await this.poRepo.findOne({
      where: { id: dto.purchaseOrderId },
      relations: ['items', 'items.product'],
    });
    if (!po) {
      throw new BadRequestException('Purchase order not found');
    }
    if (
      po.status === PoStatus.CANCELLED ||
      po.status === PoStatus.DRAFT ||
      po.status === PoStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot receive against PO with status ${po.status}`,
      );
    }
    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException(
        'Goods receipt must have at least one item',
      );
    }

    // Validate each received item against the PO
    for (const dtoItem of dto.items) {
      const poItem = po.items.find(
        (i) => Number(i.id) === Number(dtoItem.poItemId),
      );
      if (!poItem) {
        throw new BadRequestException(
          `PO item ${dtoItem.poItemId} does not belong to PO ${po.poNumber}`,
        );
      }

      const outstanding = poItem.orderedQty - poItem.receivedQty;
      if (dtoItem.receivedQty > outstanding) {
        throw new BadRequestException(
          `Received qty ${dtoItem.receivedQty} exceeds outstanding qty ${outstanding} for PO item ${dtoItem.poItemId}`,
        );
      }

      const product = poItem.product;
      if (product.productType === ProductType.SERIALIZED) {
        if (!dtoItem.imeis || dtoItem.imeis.length !== dtoItem.receivedQty) {
          throw new BadRequestException(
            `Serialized product ${product.sku} requires exactly ${dtoItem.receivedQty} IMEI(s), got ${dtoItem.imeis?.length ?? 0}`,
          );
        }
      } else if (dtoItem.imeis && dtoItem.imeis.length > 0) {
        throw new BadRequestException(
          `Non-serialized product ${product.sku} should not have IMEIs`,
        );
      }

      // Check IMEI uniqueness within the payload
      if (dtoItem.imeis) {
        const uniqueImeis = new Set(dtoItem.imeis);
        if (uniqueImeis.size !== dtoItem.imeis.length) {
          throw new BadRequestException(
            `Duplicate IMEIs in payload for product ${product.sku}`,
          );
        }
      }
    }

    const grnNumber = await this.generateGrnNumber();

    // Execute everything in a transaction
    const savedGrId = await this.dataSource.transaction(async (manager) => {
      const grRepo = manager.getRepository(GoodsReceipt);
      const grItemRepo = manager.getRepository(GoodsReceiptItem);
      const grImeiRepo = manager.getRepository(GoodsReceiptItemImei);
      const imeiRepo = manager.getRepository(ImeiUnit);
      const poItemRepoTx = manager.getRepository(PurchaseOrderItem);
      const poRepoTx = manager.getRepository(PurchaseOrder);
      const movementRepo = manager.getRepository(StockMovement);
      const balanceRepo = manager.getRepository(StockBalance);

      // Create GR header
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

      // Process each received item
      for (const dtoItem of dto.items) {
        const poItem = po.items.find(
          (i) => Number(i.id) === Number(dtoItem.poItemId),
        )!;

        const effectiveCost =
          dtoItem.actualUnitCost !== undefined && dtoItem.actualUnitCost !== null
            ? dtoItem.actualUnitCost
            : dtoItem.unitCost;

        // Create GR item
        const grItem = grItemRepo.create({
          goodsReceiptId: savedGr.id,
          poItemId: dtoItem.poItemId,
          productId: dtoItem.productId,
          receivedQty: dtoItem.receivedQty,
          unitCost: dtoItem.unitCost.toFixed(2),
          actualUnitCost:
            dtoItem.actualUnitCost !== undefined && dtoItem.actualUnitCost !== null
              ? dtoItem.actualUnitCost.toFixed(2)
              : null,
          conditionStatus: dtoItem.conditionStatus || 'GOOD',
          conditionNotes: dtoItem.conditionNotes ?? null,
        });
        const savedGrItem = await grItemRepo.save(grItem);

        // Register IMEIs for serialized items
        if (dtoItem.imeis && dtoItem.imeis.length > 0) {
          for (const imeiStr of dtoItem.imeis) {
            // Check if IMEI already exists
            const existing = await imeiRepo.findOne({
              where: { imei: imeiStr },
            });
            if (existing) {
              throw new ConflictException(
                `IMEI ${imeiStr} already exists in the system`,
              );
            }

            // Create IMEI unit
            const imeiUnit = imeiRepo.create({
              imei: imeiStr,
              productId: dtoItem.productId,
              status: ImeiStatus.IN_STOCK,
              currentLocation: 'STORE',
              lastRefType: 'GRN',
              lastRefId: savedGr.id,
            });
            const savedImei = await imeiRepo.save(imeiUnit);

            // Link IMEI to GR item
            const grImei = grImeiRepo.create({
              goodsReceiptItemId: savedGrItem.id,
              imeiUnitId: savedImei.id,
            });
            await grImeiRepo.save(grImei);

            // Stock movement for this specific IMEI unit
            const movement = movementRepo.create({
              productId: dtoItem.productId,
              imeiUnitId: savedImei.id,
              movementType: MovementType.IN,
              qty: 1,
              unitCost: effectiveCost.toFixed(2),
              refType: 'GRN',
              refId: savedGr.id,
              createdBy: userId,
              notes: `Received via ${grnNumber}${dtoItem.conditionStatus && dtoItem.conditionStatus !== 'GOOD' ? ` (${dtoItem.conditionStatus})` : ''}`,
            });
            await movementRepo.save(movement);
          }
        } else {
          // Non-serialized: single movement for the batch
          const movement = movementRepo.create({
            productId: dtoItem.productId,
            imeiUnitId: null,
            movementType: MovementType.IN,
            qty: dtoItem.receivedQty,
            unitCost: effectiveCost.toFixed(2),
            refType: 'GRN',
            refId: savedGr.id,
            createdBy: userId,
            notes: `Received via ${grnNumber}${dtoItem.conditionStatus && dtoItem.conditionStatus !== 'GOOD' ? ` (${dtoItem.conditionStatus})` : ''}`,
          });
          await movementRepo.save(movement);
        }

        // Update PO item received qty
        poItem.receivedQty += dtoItem.receivedQty;
        await poItemRepoTx.save(poItem);

        if (poItem.receivedQty < poItem.orderedQty) {
          fullyReceived = false;
        }

        // Update or create stock balance
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

      // Update PO status
      if (fullyReceived) {
        po.status = PoStatus.COMPLETED;
      } else {
        po.status = PoStatus.PARTIALLY_RECEIVED;
      }
      await poRepoTx.save(po);

      return savedGr.id;
    });

    // Return the saved GR with relations after transaction commits
    return this.findOne(Number(savedGrId));
  }

  private async generateGrnNumber(): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
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
}
