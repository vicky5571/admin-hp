import { Repository } from 'typeorm';
import { AppSetting } from './entities/app-setting.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';
export declare class SettingsService {
    private readonly repo;
    constructor(repo: Repository<AppSetting>);
    findAll(): Promise<Record<string, string>>;
    updateMany(dto: UpdateSettingsDto, userId: number): Promise<Record<string, string>>;
}
