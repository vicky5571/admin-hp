import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
export declare class AuditLogsService {
    private readonly repo;
    constructor(repo: Repository<AuditLog>);
    log(payload: {
        userId?: number | null;
        action: string;
        entityType: string;
        entityId?: number | null;
        metadataJson?: Record<string, unknown> | null;
        ipAddress?: string | null;
    }): Promise<AuditLog | undefined>;
    findAll(query: ListAuditLogsQueryDto): Promise<{
        data: AuditLog[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
}
