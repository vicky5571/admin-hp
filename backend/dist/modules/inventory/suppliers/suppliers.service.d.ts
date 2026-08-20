import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { ListSuppliersQueryDto } from '../dto/list-suppliers.query.dto';
import { AuditLogsService } from '../../audit-logs/audit-logs.service';
export declare class SuppliersService {
    private readonly repo;
    private readonly auditLogsService;
    constructor(repo: Repository<Supplier>, auditLogsService: AuditLogsService);
    findAll(query: ListSuppliersQueryDto): Promise<{
        data: Supplier[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<Supplier>;
    create(dto: CreateSupplierDto, userId?: number): Promise<Supplier>;
    update(id: number, dto: UpdateSupplierDto, userId?: number): Promise<Supplier>;
}
