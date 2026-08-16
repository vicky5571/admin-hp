import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginateMeta } from '../../common/utils/pagination.util';
import { CreateProductDto } from './dto/create-product.dto';
import { ListProductsQueryDto } from './dto/list-products.query.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private readonly productsRepo: Repository<Product>,
  ) {}

  async findAll(query: ListProductsQueryDto) {
    const qb = this.productsRepo.createQueryBuilder('product');

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

  create(dto: CreateProductDto) {
    const entity = this.productsRepo.create({
      sku: dto.sku,
      name: dto.name,
      categoryId: dto.categoryId ?? null,
      brandId: dto.brandId ?? null,
      productType: dto.productType,
      costPrice: dto.costPrice.toFixed(2),
      sellingPrice: dto.sellingPrice.toFixed(2),
      taxClassId: dto.taxClassId ?? null,
      minStockAlert: dto.minStockAlert ?? 0,
      isActive: dto.isActive ?? true,
    });
    return this.productsRepo.save(entity);
  }

  async findOne(id: number) {
    const row = await this.productsRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException('Product not found');
    }
    return row;
  }

  async update(id: number, dto: UpdateProductDto) {
    const row = await this.findOne(id);

    row.sku = dto.sku ?? row.sku;
    row.name = dto.name ?? row.name;
    row.categoryId = dto.categoryId ?? row.categoryId;
    row.brandId = dto.brandId ?? row.brandId;
    row.productType = dto.productType ?? row.productType;
    row.costPrice = dto.costPrice !== undefined ? dto.costPrice.toFixed(2) : row.costPrice;
    row.sellingPrice = dto.sellingPrice !== undefined ? dto.sellingPrice.toFixed(2) : row.sellingPrice;
    row.taxClassId = dto.taxClassId ?? row.taxClassId;
    row.minStockAlert = dto.minStockAlert ?? row.minStockAlert;
    row.isActive = dto.isActive ?? row.isActive;

    return this.productsRepo.save(row);
  }
}
