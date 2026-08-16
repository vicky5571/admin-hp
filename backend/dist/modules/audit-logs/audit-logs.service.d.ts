import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
export declare class AuditLogsService {
    private readonly repo;
    constructor(repo: Repository<AuditLog>);
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
