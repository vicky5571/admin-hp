import { AuthUser } from '../../common/types/auth-user.type';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto, ip: string): Promise<{
        token: string;
        user: {
            id: number;
            fullName: string;
            role: import("../../common/enums/role.enum").RoleName;
        };
    }>;
    logout(): {
        loggedOut: boolean;
    };
    me(user: AuthUser): AuthUser;
}
