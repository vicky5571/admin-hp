import { User } from '../../users/entities/user.entity';
export declare class AuditLog {
    id: number;
    eventTime: Date;
    userId: number | null;
    user: User | null;
    action: string;
    entityType: string;
    entityId: number | null;
    metadataJson: Record<string, unknown> | null;
    ipAddress: string | null;
}
