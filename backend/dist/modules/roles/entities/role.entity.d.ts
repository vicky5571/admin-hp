import { RoleName } from '../../../common/enums/role.enum';
import { User } from '../../users/entities/user.entity';
export declare class Role {
    id: number;
    name: RoleName;
    description: string | null;
    users: User[];
}
