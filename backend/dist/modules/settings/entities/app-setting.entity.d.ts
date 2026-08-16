import { User } from '../../users/entities/user.entity';
export declare class AppSetting {
    key: string;
    value: string;
    updatedBy: number | null;
    updatedByUser: User | null;
    updatedAt: Date;
}
