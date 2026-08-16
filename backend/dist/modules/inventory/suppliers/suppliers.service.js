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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pagination_util_1 = require("../../../common/utils/pagination.util");
const supplier_entity_1 = require("../entities/supplier.entity");
let SuppliersService = class SuppliersService {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(query) {
        const qb = this.repo.createQueryBuilder('supplier');
        if (query.q) {
            qb.andWhere('(supplier.supplierCode ILIKE :q OR supplier.name ILIKE :q)', { q: `%${query.q}%` });
        }
        if (typeof query.isActive === 'boolean') {
            qb.andWhere('supplier.isActive = :isActive', {
                isActive: query.isActive,
            });
        }
        qb.orderBy('supplier.createdAt', 'DESC')
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
    async findOne(id) {
        const row = await this.repo.findOne({ where: { id } });
        if (!row) {
            throw new common_1.NotFoundException('Supplier not found');
        }
        return row;
    }
    async create(dto) {
        const exists = await this.repo.findOne({
            where: { supplierCode: dto.supplierCode },
        });
        if (exists) {
            throw new common_1.ConflictException('Supplier code already exists');
        }
        const entity = this.repo.create({
            supplierCode: dto.supplierCode,
            name: dto.name,
            contactPerson: dto.contactPerson ?? null,
            phone: dto.phone ?? null,
            email: dto.email ?? null,
            address: dto.address ?? null,
            paymentTermsDays: dto.paymentTermsDays ?? 0,
            isActive: dto.isActive ?? true,
        });
        return this.repo.save(entity);
    }
    async update(id, dto) {
        const row = await this.findOne(id);
        if (dto.supplierCode && dto.supplierCode !== row.supplierCode) {
            const conflict = await this.repo.findOne({
                where: { supplierCode: dto.supplierCode },
            });
            if (conflict) {
                throw new common_1.ConflictException('Supplier code already exists');
            }
            row.supplierCode = dto.supplierCode;
        }
        row.name = dto.name ?? row.name;
        row.contactPerson = dto.contactPerson ?? row.contactPerson;
        row.phone = dto.phone ?? row.phone;
        row.email = dto.email ?? row.email;
        row.address = dto.address ?? row.address;
        row.paymentTermsDays = dto.paymentTermsDays ?? row.paymentTermsDays;
        row.isActive = dto.isActive ?? row.isActive;
        return this.repo.save(row);
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(supplier_entity_1.Supplier)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map