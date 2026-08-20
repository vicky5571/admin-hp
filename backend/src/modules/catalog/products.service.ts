import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../../common/utils/pagination.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Brand } from './entities/brand.entity';
import { Category } from './entities/category.entity';
import { Product } from './entities/product.entity';
import { TaxClass } from './entities/tax-class.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
    @InjectRepository(Category)
    private readonly categoryRepo: Repository<Category>,
    @InjectRepository(Brand)
    private readonly brandRepo: Repository<Brand>,
    @InjectRepository(TaxClass)
    private readonly taxClassRepo: Repository<TaxClass>,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const qb = this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.taxClass', 'taxClass');

    if (query.q) {
      qb.andWhere('(product.sku ILIKE :q OR product.name ILIKE :q)', {
        q: `%${query.q}%`,
      });
    }
    if (query.categoryId) {
      qb.andWhere('product.categoryId = :categoryId', {
        categoryId: query.categoryId,
      });
    }
    if (query.brandId) {
      qb.andWhere('product.brandId = :brandId', { brandId: query.brandId });
    }
    if (query.productType) {
      qb.andWhere('product.productType = :productType', {
        productType: query.productType,
      });
    }
    if (typeof query.isActive === 'boolean') {
      qb.andWhere('product.isActive = :isActive', { isActive: query.isActive });
    }

    qb.orderBy('product.createdAt', 'DESC')
      .skip((query.page - 1) * query.limit)
      .take(query.limit);

    const [rows, total] = await qb.getManyAndCount();
    return { data: rows, meta: paginateMeta(total, query.page, query.limit) };
  }

  async create(dto: CreateProductDto) {
    const existing = await this.productsRepo.findOne({
      where: { sku: dto.sku.trim() },
    });
    if (existing) {
      throw new ConflictException(`SKU "${dto.sku}" already exists`);
    }

    const entity = this.productsRepo.create({
      sku: dto.sku.trim(),
      name: dto.name.trim(),
      categoryId: dto.categoryId ?? null,
      brandId: dto.brandId ?? null,
      productType: dto.productType,
      costPrice: dto.costPrice.toFixed(2),
      sellingPrice: dto.sellingPrice.toFixed(2),
      taxClassId: dto.taxClassId ?? null,
      minStockAlert: dto.minStockAlert ?? 0,
      isActive: dto.isActive ?? true,
    });
    const saved = await this.productsRepo.save(entity);
    return this.findOne(saved.id);
  }

  async findOne(id: number) {
    const row = await this.productsRepo
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.brand', 'brand')
      .leftJoinAndSelect('product.taxClass', 'taxClass')
      .where('product.id = :id', { id })
      .getOne();

    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return row;
  }

  async update(id: number, dto: UpdateProductDto) {
    const row = await this.findOne(id);

    if (dto.sku && dto.sku.trim() !== row.sku) {
      const existing = await this.productsRepo.findOne({
        where: { sku: dto.sku.trim() },
      });
      if (existing && Number(existing.id) !== Number(id)) {
        throw new ConflictException(`SKU "${dto.sku}" already exists`);
      }
      row.sku = dto.sku.trim();
    }

    if (dto.name !== undefined) row.name = dto.name.trim();
    if (dto.categoryId !== undefined) row.categoryId = dto.categoryId;
    if (dto.brandId !== undefined) row.brandId = dto.brandId;
    if (dto.productType !== undefined) row.productType = dto.productType;
    if (dto.costPrice !== undefined) row.costPrice = dto.costPrice.toFixed(2);
    if (dto.sellingPrice !== undefined) row.sellingPrice = dto.sellingPrice.toFixed(2);
    if (dto.taxClassId !== undefined) row.taxClassId = dto.taxClassId;
    if (dto.minStockAlert !== undefined) row.minStockAlert = dto.minStockAlert;
    if (dto.isActive !== undefined) row.isActive = dto.isActive;

    await this.productsRepo.save(row);
    return this.findOne(id);
  }

  async delete(id: number) {
    const row = await this.findOne(id);
    await this.productsRepo.remove(row);
    return { success: true, message: `Product ${row.sku} deleted` };
  }

  // Categories
  async findCategories() {
    return this.categoryRepo.find({
      order: { name: 'ASC' },
    });
  }

  async createCategory(name: string) {
    const trimmed = name.trim();
    const existing = await this.categoryRepo.findOne({
      where: { name: trimmed },
    });
    if (existing) {
      return existing;
    }
    const cat = this.categoryRepo.create({ name: trimmed, isActive: true });
    return this.categoryRepo.save(cat);
  }

  // Brands
  async findBrands() {
    return this.brandRepo.find({
      order: { name: 'ASC' },
    });
  }

  async createBrand(name: string) {
    const trimmed = name.trim();
    const existing = await this.brandRepo.findOne({
      where: { name: trimmed },
    });
    if (existing) {
      return existing;
    }
    const brand = this.brandRepo.create({ name: trimmed, isActive: true });
    return this.brandRepo.save(brand);
  }

  // Tax Classes
  async findTaxClasses() {
    return this.taxClassRepo.find({
      order: { name: 'ASC' },
    });
  }
}
