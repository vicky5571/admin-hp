import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../../../common/utils/pagination.util';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { ListSuppliersQueryDto } from '../dto/list-suppliers.query.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';

@Injectable()
export class SuppliersService {
  constructor(
    @InjectRepository(Supplier)
    private readonly repo: Repository<Supplier>,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async findAll(query: ListSuppliersQueryDto) {
    const qb = this.repo.createQueryBuilder('supplier');

    if (query.q) {
      qb.andWhere(
        '(supplier.supplierCode ILIKE :q OR supplier.name ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }
    if (typeof query.isActive === 'boolean') {
      qb.andWhere('supplier.isActive = :isActive', {
        isActive: query.isActive,
      });
    }

    qb.orderBy('supplier.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async findOne(id: number) {
    const row = await this.repo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Supplier not found');
    }
    return row;
  }

  async create(dto: CreateSupplierDto, userId?: number) {
    const exists = await this.repo.findOne({
      where: { supplierCode: dto.supplierCode },
    });
    if (exists) {
      throw new ConflictException('Supplier code already exists');
    }

    const entity = this.repo.create({
      supplierCode: dto.supplierCode,
      name: dto.name,
      contactPerson: dto.contactPerson ?? null,
      phone: dto.phone ?? null,
      email: dto.email ?? null,
      address: dto.address ?? null,
      paymentTermsDays: dto.paymentTermsDays ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.repo.save(entity);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'SUPPLIER_CREATED',
      entityType: 'SUPPLIER',
      entityId: Number(saved.id),
      metadataJson: { supplierCode: saved.supplierCode, name: saved.name },
    });

    return saved;
  }

  async update(id: number, dto: UpdateSupplierDto, userId?: number) {
    const row = await this.findOne(id);

    if (dto.supplierCode && dto.supplierCode !== row.supplierCode) {
      const conflict = await this.repo.findOne({
        where: { supplierCode: dto.supplierCode },
      });
      if (conflict) {
        throw new ConflictException('Supplier code already exists');
      }
      row.supplierCode = dto.supplierCode;
    }

    row.name = dto.name ?? row.name;
    row.contactPerson = dto.contactPerson ?? row.contactPerson;
    row.phone = dto.phone ?? row.phone;
    row.email = dto.email ?? row.email;
    row.address = dto.address ?? row.address;
    row.paymentTermsDays = dto.paymentTermsDays ?? row.paymentTermsDays;
    row.isActive = dto.isActive ?? row.isActive;

    const saved = await this.repo.save(row);

    await this.auditLogsService.log({
      userId: userId ?? null,
      action: 'SUPPLIER_UPDATED',
      entityType: 'SUPPLIER',
      entityId: Number(saved.id),
      metadataJson: { supplierCode: saved.supplierCode, name: saved.name },
    });

    return saved;
  }
}
