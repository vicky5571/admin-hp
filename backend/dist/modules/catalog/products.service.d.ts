import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { TaxClass } from './entities/tax-class.entity';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
export declare class ProductsService {
    private readonly productsRepo;
    private readonly categoryRepo;
    private readonly brandRepo;
    private readonly taxClassRepo;
    private readonly auditLogsService;
    constructor(productsRepo: Repository<Product>, categoryRepo: Repository<Category>, brandRepo: Repository<Brand>, taxClassRepo: Repository<TaxClass>, auditLogsService: AuditLogsService);
    findAll(query: ListProductsQueryDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    create(dto: CreateProductDto, userId?: number): Promise<Product>;
    findOne(id: number): Promise<Product>;
    update(id: number, dto: UpdateProductDto, userId?: number): Promise<Product>;
    delete(id: number, userId?: number): Promise<{
        success: boolean;
        message: string;
    }>;
    findCategories(): Promise<Category[]>;
    createCategory(name: string, userId?: number): Promise<Category>;
    findBrands(): Promise<Brand[]>;
    createBrand(name: string, userId?: number): Promise<Brand>;
    findTaxClasses(): Promise<TaxClass[]>;
}
