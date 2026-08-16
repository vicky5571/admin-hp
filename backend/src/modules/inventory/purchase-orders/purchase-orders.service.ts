import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { CreatePurchaseOrderDto } from '../dto/create-purchase-order.dto';
import { ListPurchaseOrdersQueryDto } from '../dto/list-purchase-orders.query.dto';
import { PurchaseOrder } from '../entities/purchase-order.entity';
import { PurchaseOrderItem } from '../entities/purchase-order-item.entity';
import { Supplier } from '../entities/supplier.entity';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @InjectRepository(PurchaseOrder)
    private readonly poRepo: Repository<PurchaseOrder>,
    @InjectRepository(Supplier)
    private readonly supplierRepo: Repository<Supplier>,
    private readonly dataSource: DataSource,
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

    const items = dto.items.map(
      (i) =>
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

    return this.poRepo.save(po);
  }

  async submit(id: number) {
    const po = await this.findOne(id);
    if (po.status !== PoStatus.DRAFT) {
      throw new BadRequestException(
        `Cannot submit PO with status ${po.status}`,
      );
    }
    po.status = PoStatus.SUBMITTED;
    return this.poRepo.save(po);
  }

  async cancel(id: number) {
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
    return this.poRepo.save(po);
  }

  private async generatePoNumber(): Promise<string> {
    const date = new Date();
    const ymd =
      date.getFullYear().toString() +
      (date.getMonth() + 1).toString().padStart(2, '0') +
      date.getDate().toString().padStart(2, '0');

    // Count POs created today to generate a sequential number
    const todayPrefix = `PO-${ymd}-`;
    const count = await this.poRepo
      .createQueryBuilder('po')
      .where('po.poNumber LIKE :prefix', { prefix: `${todayPrefix}%` })
      .getCount();

    const seq = (count + 1).toString().padStart(3, '0');
    const candidate = `${todayPrefix}${seq}`;

    // Ensure uniqueness
    const exists = await this.poRepo.findOne({
      where: { poNumber: candidate },
    });
    if (exists) {
      // Fallback: append timestamp
      return `${todayPrefix}${Date.now().toString().slice(-6)}`;
    }
    return candidate;
  }
}
