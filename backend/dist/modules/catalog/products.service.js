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
const brand_entity_1 = require("./entities/brand.entity");
const category_entity_1 = require("./entities/category.entity");
const product_entity_1 = require("./entities/product.entity");
const tax_class_entity_1 = require("./entities/tax-class.entity");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
let ProductsService = class ProductsService {
    constructor(productsRepo, categoryRepo, brandRepo, taxClassRepo, auditLogsService) {
        this.productsRepo = productsRepo;
        this.categoryRepo = categoryRepo;
        this.brandRepo = brandRepo;
        this.taxClassRepo = taxClassRepo;
        this.auditLogsService = auditLogsService;
    }
    async findAll(query) {
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
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async create(dto, userId) {
        const existing = await this.productsRepo.findOne({
            where: { sku: dto.sku.trim() },
        });
        if (existing) {
            throw new common_1.ConflictException(`SKU "${dto.sku}" already exists`);
        }
        const entity = this.productsRepo.create({
            sku: dto.sku.trim(),
            name: dto.name.trim(),
            categoryId: dto.categoryId ?? null,
            brandId: dto.brandId ?? null,
            productType: dto.productType,
            costPrice: dto.costPrice.toFixed(2),
            srp: dto.srp.toFixed(2),
            taxClassId: dto.taxClassId ?? null,
            minStockAlert: dto.minStockAlert ?? 0,
            isActive: dto.isActive ?? true,
        });
        const saved = await this.productsRepo.save(entity);
        const result = await this.findOne(saved.id);
        await this.auditLogsService.log({
            userId: userId ?? null,
            action: 'PRODUCT_CREATED',
            entityType: 'PRODUCT',
            entityId: Number(saved.id),
            metadataJson: {
                sku: saved.sku,
                name: saved.name,
                productType: saved.productType,
                srp: saved.srp,
            },
        });
        return result;
    }
    async findOne(id) {
        const row = await this.productsRepo
            .createQueryBuilder('product')
            .leftJoinAndSelect('product.category', 'category')
            .leftJoinAndSelect('product.brand', 'brand')
            .leftJoinAndSelect('product.taxClass', 'taxClass')
            .where('product.id = :id', { id })
            .getOne();
        if (!row) {
            throw new common_1.NotFoundException('Product not found');
        }
        return row;
    }
    async update(id, dto, userId) {
        const row = await this.findOne(id);
        if (dto.sku && dto.sku.trim() !== row.sku) {
            const existing = await this.productsRepo.findOne({
                where: { sku: dto.sku.trim() },
            });
            if (existing && Number(existing.id) !== Number(id)) {
                throw new common_1.ConflictException(`SKU "${dto.sku}" already exists`);
            }
            row.sku = dto.sku.trim();
        }
        if (dto.name !== undefined)
            row.name = dto.name.trim();
        if (dto.categoryId !== undefined)
            row.categoryId = dto.categoryId;
        if (dto.brandId !== undefined)
            row.brandId = dto.brandId;
        if (dto.productType !== undefined)
            row.productType = dto.productType;
        if (dto.costPrice !== undefined)
            row.costPrice = dto.costPrice.toFixed(2);
        if (dto.srp !== undefined)
            row.srp = dto.srp.toFixed(2);
        if (dto.taxClassId !== undefined)
            row.taxClassId = dto.taxClassId;
        if (dto.minStockAlert !== undefined)
            row.minStockAlert = dto.minStockAlert;
        if (dto.isActive !== undefined)
            row.isActive = dto.isActive;
        await this.productsRepo.save(row);
        const updated = await this.findOne(id);
        await this.auditLogsService.log({
            userId: userId ?? null,
            action: 'PRODUCT_UPDATED',
            entityType: 'PRODUCT',
            entityId: Number(id),
            metadataJson: { sku: row.sku, name: row.name, isActive: row.isActive },
        });
        return updated;
    }
    async delete(id, userId) {
        const row = await this.findOne(id);
        await this.productsRepo.remove(row);
        await this.auditLogsService.log({
            userId: userId ?? null,
            action: 'PRODUCT_DELETED',
            entityType: 'PRODUCT',
            entityId: Number(id),
            metadataJson: { sku: row.sku, name: row.name },
        });
        return { success: true, message: `Product ${row.sku} deleted` };
    }
    async findCategories() {
        return this.categoryRepo.find({
            order: { name: 'ASC' },
        });
    }
    async createCategory(name, userId) {
        const trimmed = name.trim();
        const existing = await this.categoryRepo.findOne({
            where: { name: trimmed },
        });
        if (existing) {
            return existing;
        }
        const cat = this.categoryRepo.create({ name: trimmed, isActive: true });
        const saved = await this.categoryRepo.save(cat);
        await this.auditLogsService.log({
            userId: userId ?? null,
            action: 'CATEGORY_CREATED',
            entityType: 'CATEGORY',
            entityId: Number(saved.id),
            metadataJson: { name: saved.name },
        });
        return saved;
    }
    async findBrands() {
        return this.brandRepo.find({
            order: { name: 'ASC' },
        });
    }
    async createBrand(name, userId) {
        const trimmed = name.trim();
        const existing = await this.brandRepo.findOne({
            where: { name: trimmed },
        });
        if (existing) {
            return existing;
        }
        const brand = this.brandRepo.create({ name: trimmed, isActive: true });
        const saved = await this.brandRepo.save(brand);
        await this.auditLogsService.log({
            userId: userId ?? null,
            action: 'BRAND_CREATED',
            entityType: 'BRAND',
            entityId: Number(saved.id),
            metadataJson: { name: saved.name },
        });
        return saved;
    }
    async findTaxClasses() {
        return this.taxClassRepo.find({
            order: { name: 'ASC' },
        });
    }
};
exports.ProductsService = ProductsService;
exports.ProductsService = ProductsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(product_entity_1.Product)),
    __param(1, (0, typeorm_1.InjectRepository)(category_entity_1.Category)),
    __param(2, (0, typeorm_1.InjectRepository)(brand_entity_1.Brand)),
    __param(3, (0, typeorm_1.InjectRepository)(tax_class_entity_1.TaxClass)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        typeorm_2.Repository,
        audit_logs_service_1.AuditLogsService])
], ProductsService);
//# sourceMappingURL=products.service.js.map