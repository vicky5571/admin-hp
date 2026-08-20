import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role.enum';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersRepo;
    private readonly jwtService;
    private readonly auditLogsService;
    constructor(usersRepo: Repository<User>, jwtService: JwtService, auditLogsService: AuditLogsService);
    login(dto: LoginDto, ipAddress?: string): Promise<{
        token: string;
        user: {
            id: number;
            fullName: string;
            role: RoleName;
        };
    }>;
}
