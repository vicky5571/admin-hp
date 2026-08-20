import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { TaxClass } from './entities/tax-class.entity';
export declare class ProductsService {
    private readonly productsRepo;
    private readonly categoryRepo;
    private readonly brandRepo;
    private readonly taxClassRepo;
    constructor(productsRepo: Repository<Product>, categoryRepo: Repository<Category>, brandRepo: Repository<Brand>, taxClassRepo: Repository<TaxClass>);
    findAll(query: ListProductsQueryDto): Promise<{
        data: Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    create(dto: CreateProductDto): Promise<Product>;
    findOne(id: number): Promise<Product>;
    update(id: number, dto: UpdateProductDto): Promise<Product>;
    delete(id: number): Promise<{
        success: boolean;
        message: string;
    }>;
    findCategories(): Promise<Category[]>;
    createCategory(name: string): Promise<Category>;
    findBrands(): Promise<Brand[]>;
    createBrand(name: string): Promise<Brand>;
    findTaxClasses(): Promise<TaxClass[]>;
}
