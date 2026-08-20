import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../../common/utils/pagination.util';
import { ImeiStatus } from '../../common/enums/imei-status.enum';
import { ListImeiQueryDto } from './dto/list-imei.query.dto';
import { UpdateImeiStatusDto } from './dto/update-imei-status.dto';
import { ImeiUnit } from './entities/imei-unit.entity';
import { Sale } from '../sales/entities/sale.entity';
import { Return } from '../sales/entities/return.entity';
import { GoodsReceipt } from '../inventory/entities/goods-receipt.entity';

const MUTABLE_STATUSES: ImeiStatus[] = [
  ImeiStatus.DEFECTIVE,
  ImeiStatus.RESERVED,
  ImeiStatus.IN_STOCK,
];

@Injectable()
export class ImeiService {
  constructor(
    @InjectRepository(ImeiUnit)
    private readonly imeiRepo: Repository<ImeiUnit>,
    @InjectRepository(Sale)
    private readonly saleRepo: Repository<Sale>,
    @InjectRepository(Return)
    private readonly returnRepo: Repository<Return>,
    @InjectRepository(GoodsReceipt)
    private readonly grRepo: Repository<GoodsReceipt>,
  ) {}

  async findAll(query: ListImeiQueryDto) {
    const qb = this.imeiRepo.createQueryBuilder('unit');

    if (query.q) {
      qb.andWhere('unit.imei ILIKE :q', { q: `%${query.q}%` });
    }
    if (query.status) {
      qb.andWhere('unit.status = :status', { status: query.status });
    }
    if (query.productId) {
      qb.andWhere('unit.productId = :productId', {
        productId: query.productId,
      });
    }

    qb.leftJoinAndSelect('unit.product', 'product')
      .orderBy('unit.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findByImei(imei: string) {
    const unit = await this.imeiRepo.findOne({
      where: { imei },
      relations: ['product'],
    });
    if (!unit) {
      throw new NotFoundException('IMEI not found');
    }

    let sale: Sale | null = null;
    if (unit.lastRefType === 'SALE' && unit.lastRefId) {
      sale = await this.saleRepo.findOne({
        where: { id: unit.lastRefId },
        relations: ['cashier'],
      });
    }

    let returnDoc: Return | null = null;
    if (unit.lastRefType === 'RETURN' && unit.lastRefId) {
      returnDoc = await this.returnRepo.findOne({
        where: { id: unit.lastRefId },
      });
    }

    let goodsReceipt: GoodsReceipt | null = null;
    if (unit.lastRefType === 'GRN' && unit.lastRefId) {
      goodsReceipt = await this.grRepo.findOne({
        where: { id: unit.lastRefId },
        relations: ['purchaseOrder'],
      });
    }

    return { unit, sale, return: returnDoc, goodsReceipt };
  }

  async findAvailable(productId: number) {
    const rows = await this.imeiRepo.find({
      where: { productId, status: ImeiStatus.IN_STOCK },
      order: { createdAt: 'ASC' },
    });
    return rows;
  }

  async updateStatus(id: number, dto: UpdateImeiStatusDto) {
    if (dto.status && !MUTABLE_STATUSES.includes(dto.status)) {
      throw new BadRequestException(
        'Status can only be set to IN_STOCK, DEFECTIVE, or RESERVED',
      );
    }

    const unit = await this.imeiRepo.findOne({ where: { id } });
    if (!unit) {
      throw new NotFoundException('IMEI not found');
    }
    if (dto.status && unit.status === ImeiStatus.SOLD && dto.status !== ImeiStatus.SOLD) {
      throw new BadRequestException(
        'Sold IMEI status cannot be changed manually; process a return instead',
      );
    }

    if (dto.status) {
      unit.status = dto.status;
    }
    if (dto.location !== undefined) {
      unit.currentLocation = dto.location.trim();
    }
    if (dto.conditionGrade !== undefined) {
      unit.conditionGrade = dto.conditionGrade ? dto.conditionGrade.trim() : null;
    }
    if (dto.batteryHealth !== undefined) {
      unit.batteryHealth =
        dto.batteryHealth !== null && !isNaN(Number(dto.batteryHealth))
          ? Number(dto.batteryHealth)
          : null;
    }
    return this.imeiRepo.save(unit);
  }

  async stats() {
    const rows = await this.imeiRepo
      .createQueryBuilder('unit')
      .select('unit.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('unit.status')
      .getRawMany();

    const byStatus: Record<string, number> = {};
    for (const status of Object.values(ImeiStatus)) {
      byStatus[status] = 0;
    }
    for (const row of rows) {
      byStatus[row.status] = Number(row.count);
    }

    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus,
    };
  }
}
