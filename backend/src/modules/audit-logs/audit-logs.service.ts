import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../../common/utils/pagination.util';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';

@Injectable()
export class AuditLogsService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repo: Repository<AuditLog>,
  ) {}

  async log(payload: {
    userId?: number | null;
    action: string;
    entityType: string;
    entityId?: number | null;
    metadataJson?: Record<string, unknown> | null;
    ipAddress?: string | null;
  }) {
    try {
      const entry = this.repo.create({
        eventTime: new Date(),
        userId: payload.userId ?? null,
        action: payload.action,
        entityType: payload.entityType,
        entityId: payload.entityId ?? null,
        metadataJson: payload.metadataJson ?? null,
        ipAddress: payload.ipAddress ?? null,
      });
      return await this.repo.save(entry);
    } catch (err) {
      console.warn('Failed to persist audit log:', err);
    }
  }

  async findAll(query: ListAuditLogsQueryDto) {
    const qb = this.repo
      .createQueryBuilder('log')
      .leftJoinAndSelect('log.user', 'user')
      .select([
        'log.id',
        'log.eventTime',
        'log.userId',
        'log.action',
        'log.entityType',
        'log.entityId',
        'log.metadataJson',
        'log.ipAddress',
        'user.id',
        'user.fullName',
        'user.username',
        'user.email',
        'user.roleId',
        'user.isActive',
      ]);

    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.action) {
      qb.andWhere('log.action = :action', { action: query.action });
    }
    if (query.entityType) {
      qb.andWhere('log.entityType = :entityType', {
        entityType: query.entityType,
      });
    }
    if (query.dateFrom) {
      qb.andWhere('log.eventTime >= :dateFrom', { dateFrom: query.dateFrom });
    }
    if (query.dateTo) {
      qb.andWhere('log.eventTime <= :dateTo', { dateTo: query.dateTo });
    }

    qb.orderBy('log.eventTime', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }
}
