import { ListAuditLogsQueryDto } from './dto/list-audit-logs.query.dto';
import { AuditLogsService } from './audit-logs.service';
export declare class AuditLogsController {
    private readonly service;
    constructor(service: AuditLogsService);
    findAll(query: ListAuditLogsQueryDto): Promise<{
        data: import("./entities/audit-log.entity").AuditLog[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
}
