import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { UpdatePurchaseOrderDto } from '../dto/update-purchase-order.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';
import { GoodsReceipt } from '../entities/goods-receipt.entity';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly dataSource: DataSource,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: ListPurchaseOrdersQueryDto) {
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
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
    const row = await this.poRepo.findOne({
      where: { id },
      relations: ['supplier', 'items', 'items.product', 'creator'],
    });
    if (!row) {
      throw new NotFoundException('Purchase order not found');
    }
    return row;
  }

  async create(dto: CreatePurchaseOrderDto, userId: number) {
    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('PO must have at least one item');
    }

    const poNumber = await this.generatePoNumber();

    const items = dto.items.map((i) =>
      this.dataSource.getRepository(PurchaseOrderItem).create({
        productId: i.productId,
        orderedQty: i.orderedQty,
        receivedQty: 0,
        unitCost: i.unitCost.toFixed(2),
      }),
    );

    const po = this.poRepo.create({
      poNumber,
      supplierId: dto.supplierId,
      status: PoStatus.DRAFT,
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

  async update(id: number, dto: UpdatePurchaseOrderDto, userId: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot edit purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be edited.`,
      );
    }

    const supplier = await this.supplierRepo.findOne({
      where: { id: dto.supplierId },
    });
    if (!supplier) {
      throw new BadRequestException('Supplier not found');
    }

    if (!dto.items || dto.items.length === 0) {
      throw new BadRequestException('PO must have at least one item');
    }

    await this.dataSource.transaction(async (manager) => {
      const poItemRepo = manager.getRepository(PurchaseOrderItem);
      const poRepoTx = manager.getRepository(PurchaseOrder);

      // Remove existing items
      await poItemRepo.delete({ purchaseOrderId: id });

      // Create new items
      const newItems = dto.items.map((i) =>
        poItemRepo.create({
          purchaseOrderId: id,
          productId: i.productId,
          orderedQty: i.orderedQty,
          receivedQty: 0,
          unitCost: i.unitCost.toFixed(2),
        }),
      );
      await poItemRepo.save(newItems);

      // Update header
      po.supplierId = dto.supplierId;
      po.orderDate = dto.orderDate;
      po.expectedDate = dto.expectedDate ?? null;
      po.notes = dto.notes ?? null;
      if (po.status === PoStatus.REJECTED) {
        po.status = PoStatus.DRAFT;
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

  async remove(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot delete purchase order with status ${po.status}. Only DRAFT or REJECTED POs can be deleted.`,
      );
    }

    const grCount = await this.dataSource
      .getRepository(GoodsReceipt)
      .count({ where: { purchaseOrderId: id } });
    if (grCount > 0) {
      throw new BadRequestException(
        'Cannot delete purchase order with existing goods receipts.',
      );
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

  async submit(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT && po.status !== PoStatus.REJECTED) {
      throw new BadRequestException(
        `Cannot submit PO with status ${po.status}. Only DRAFT or REJECTED POs can be submitted.`,
      );
    }
    po.status = PoStatus.SUBMITTED;
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

  async approve(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot approve PO with status ${po.status}. Only SUBMITTED POs can be approved.`,
      );
    }
    po.status = PoStatus.APPROVED;
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

  async reject(id: number, reason?: string, userId?: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.SUBMITTED) {
      throw new BadRequestException(
        `Cannot reject PO with status ${po.status}. Only SUBMITTED POs can be rejected.`,
      );
    }
    po.status = PoStatus.REJECTED;
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

  async cancel(id: number, userId?: number) {
    const po = await this.findOne(id);
    if (
      po.status === PoStatus.COMPLETED ||
      po.status === PoStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot cancel PO with status ${po.status}`,
      );
    }
    po.status = PoStatus.CANCELLED;
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

  private async generatePoNumber(): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
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
}
