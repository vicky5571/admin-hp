import { AuthUser } from '../../common/types/auth-user.type';
import { ChangePasswordDto, CreateUserDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto';
import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(): Promise<import("./entities/user.entity").User[]>;
    getRoles(): Promise<import("../roles/entities/role.entity").Role[]>;
    findOne(id: number): Promise<import("./entities/user.entity").User | null>;
    create(dto: CreateUserDto): Promise<import("./entities/user.entity").User | null>;
    update(id: number, dto: UpdateUserDto): Promise<import("./entities/user.entity").User | null>;
    changePassword(id: number, dto: ChangePasswordDto, user: AuthUser): Promise<{
        message: string;
    }>;
    resetPassword(id: number, dto: ResetPasswordDto): Promise<{
        message: string;
    }>;
}
