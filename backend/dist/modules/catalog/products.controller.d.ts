import { AuthUser } from '../../common/types/auth-user.type';
import { CreateBrandDto } from './dto/create-brand.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(query: ListProductsQueryDto): Promise<{
        data: import("./entities/product.entity").Product[];
        meta: {
            total: number;
            page: number;
            limit: number;
            pageCount: number;
        };
    }>;
    findCategories(): Promise<import("./entities/category.entity").Category[]>;
    createCategory(dto: CreateCategoryDto, user: AuthUser): Promise<import("./entities/category.entity").Category>;
    findBrands(): Promise<import("./entities/brand.entity").Brand[]>;
    createBrand(dto: CreateBrandDto, user: AuthUser): Promise<import("./entities/brand.entity").Brand>;
    findTaxClasses(): Promise<import("./entities/tax-class.entity").TaxClass[]>;
    create(dto: CreateProductDto, user: AuthUser): Promise<import("./entities/product.entity").Product>;
    findOne(id: number): Promise<import("./entities/product.entity").Product>;
    update(id: number, dto: UpdateProductDto, user: AuthUser): Promise<import("./entities/product.entity").Product>;
    delete(id: number, user: AuthUser): Promise<{
        success: boolean;
        message: string;
    }>;
}
