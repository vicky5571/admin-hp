import { AuthUser } from '../../common/types/auth-user.type';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService } from './settings.service';
export declare class SettingsController {
    private readonly service;
    constructor(service: SettingsService);
    findAll(): Promise<Record<string, string>>;
    update(dto: UpdateSettingsDto, user: AuthUser): Promise<Record<string, string>>;
}
