import { Repository } from 'typeorm';
import { Supplier } from '../entities/supplier.entity';
import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { ListSuppliersQueryDto } from '../dto/list-suppliers.query.dto';
export declare class SuppliersService {
    private readonly repo;
    constructor(repo: Repository<Supplier>);
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
    create(dto: CreateSupplierDto): Promise<Supplier>;
    update(id: number, dto: UpdateSupplierDto): Promise<Supplier>;
}
