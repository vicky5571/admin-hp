import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class SettingsService {
    private readonly repo;
    private readonly auditLogsService;
    constructor(repo: Repository<AppSetting>, auditLogsService: AuditLogsService);
    findAll(): Promise<Record<string, string>>;
    updateMany(dto: UpdateSettingsDto, userId: number): Promise<Record<string, string>>;
}
