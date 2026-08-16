import { Role } from '../../roles/entities/role.entity';
export declare class User {
    id: number;
    fullName: string;
    username: string;
    email: string | null;
    passwordHash: string;
    roleId: number;
    role: Role;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}
