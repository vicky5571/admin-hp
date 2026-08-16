import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import { RoleName } from '../../common/enums/role.enum';
import { User } from '../users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
export declare class AuthService {
    private readonly usersRepo;
    private readonly jwtService;
    constructor(usersRepo: Repository<User>, jwtService: JwtService);
    login(dto: LoginDto): Promise<{
        token: string;
        user: {
            id: number;
            fullName: string;
            role: RoleName;
        };
    }>;
}
