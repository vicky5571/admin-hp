"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pagination_util_1 = require("../../common/utils/pagination.util");
const product_entity_1 = require("./entities/product.entity");
let ProductsService = class ProductsService {
    constructor(productsRepo) {
        this.productsRepo = productsRepo;
    }
    async findAll(query) {
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
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    create(dto) {
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
    async findOne(id) {
        const row = await this.productsRepo.findOne({ where: { id } });
        if (!row) {
            throw new common_1.NotFoundException('Product not found');
        }
        return row;
    }
    async update(id, dto) {
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
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], ProductsService);
//# sourceMappingURL=products.service.js.map