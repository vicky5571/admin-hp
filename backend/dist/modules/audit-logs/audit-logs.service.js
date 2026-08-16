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
exports.AuditLogsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const pagination_util_1 = require("../../common/utils/pagination.util");
const audit_log_entity_1 = require("./entities/audit-log.entity");
let AuditLogsService = class AuditLogsService {
    constructor(repo) {
        this.repo = repo;
    }
    async findAll(query) {
        const qb = this.repo
            .createQueryBuilder('log')
            .leftJoinAndSelect('log.user', 'user')
            .select([
            'log.id',
            'log.eventTime',
            'log.userId',
            'log.action',
            'log.entityType',
            'log.entityId',
            'log.metadataJson',
            'log.ipAddress',
            'user.id',
            'user.fullName',
            'user.username',
            'user.email',
            'user.roleId',
            'user.isActive',
        ]);
        if (query.userId) {
            qb.andWhere('log.userId = :userId', { userId: query.userId });
        }
        if (query.action) {
            qb.andWhere('log.action = :action', { action: query.action });
        }
        if (query.entityType) {
            qb.andWhere('log.entityType = :entityType', {
                entityType: query.entityType,
            });
        }
        if (query.dateFrom) {
            qb.andWhere('log.eventTime >= :dateFrom', { dateFrom: query.dateFrom });
        }
        if (query.dateTo) {
            qb.andWhere('log.eventTime <= :dateTo', { dateTo: query.dateTo });
        }
        qb.orderBy('log.eventTime', 'DESC')
            .skip((query.page - 1) * query.limit)
            .take(query.limit);
        const [rows, total] = await qb.getManyAndCount();
        return { data: rows, meta: (0, pagination_util_1.paginateMeta)(total, query.page, query.limit) };
    }
};
exports.AuditLogsService = AuditLogsService;
exports.AuditLogsService = AuditLogsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(audit_log_entity_1.AuditLog)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], AuditLogsService);
//# sourceMappingURL=audit-logs.service.js.map