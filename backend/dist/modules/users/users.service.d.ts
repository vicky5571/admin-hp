import { Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from './entities/user.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class UsersService {
    private readonly usersRepo;
    private readonly rolesRepo;
    private readonly auditLogsService;
    constructor(usersRepo: Repository<User>, rolesRepo: Repository<Role>, auditLogsService: AuditLogsService);
    findAll(): Promise<User[]>;
    findOne(id: number): Promise<User | null>;
    create(dto: {
        fullName: string;
        username: string;
        email?: string;
        password: string;
        roleId: number;
    }, performedByUserId?: number): Promise<User | null>;
    update(id: number, dto: {
        fullName?: string;
        username?: string;
        email?: string;
        roleId?: number;
        isActive?: boolean;
    }, performedByUserId?: number): Promise<User | null>;
    changePassword(id: number, currentPassword: string, newPassword: string): Promise<{
        message: string;
    }>;
    resetPassword(id: number, newPassword: string, performedByUserId?: number): Promise<{
        message: string;
    }>;
    getRoles(): Promise<Role[]>;
}
