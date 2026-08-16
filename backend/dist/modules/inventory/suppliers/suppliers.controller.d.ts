import { CreateSupplierDto } from '../dto/create-supplier.dto';
import { ListSuppliersQueryDto } from '../dto/list-suppliers.query.dto';
import { UpdateSupplierDto } from '../dto/update-supplier.dto';
import { SuppliersService } from './suppliers.service';
export declare class SuppliersController {
    private readonly service;
    constructor(service: SuppliersService);
    findAll(query: ListSuppliersQueryDto): Promise<{
        data: import("../entities/supplier.entity").Supplier[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findOne(id: number): Promise<import("../entities/supplier.entity").Supplier>;
    create(dto: CreateSupplierDto): Promise<import("../entities/supplier.entity").Supplier>;
    update(id: number, dto: UpdateSupplierDto): Promise<import("../entities/supplier.entity").Supplier>;
}
