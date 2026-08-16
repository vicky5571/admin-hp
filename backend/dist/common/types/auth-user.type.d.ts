import { RoleName } from '../enums/role.enum';
export type AuthUser = {
    id: number;
    username: string;
    fullName: string;
    role: RoleName;
};
