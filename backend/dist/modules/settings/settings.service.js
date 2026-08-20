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
exports.SettingsService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const app_setting_entity_1 = require("./entities/app-setting.entity");
const audit_logs_service_1 = require("../audit-logs/audit-logs.service");
const SETTING_VALIDATORS = {
    CURRENCY_CODE: (v) => {
        if (v.length < 2 || v.length > 10)
            return 'CURRENCY_CODE must be 2–10 characters';
    },
    TAX_MODE: (v) => {
        if (!['EXCLUSIVE', 'INCLUSIVE', 'NONE'].includes(v))
            return 'TAX_MODE must be one of: EXCLUSIVE, INCLUSIVE, NONE';
    },
    TAX_DEFAULT_RATE: (v) => {
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > 100)
            return 'TAX_DEFAULT_RATE must be a number between 0 and 100';
    },
    RECEIPT_PREFIX: (v) => {
        if (v.length < 1 || v.length > 20)
            return 'RECEIPT_PREFIX must be 1–20 characters';
    },
    RECEIPT_FOOTER: (v) => {
        if (v.length > 500)
            return 'RECEIPT_FOOTER must be at most 500 characters';
    },
    RETURN_WINDOW_DAYS: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 0 || n > 365)
            return 'RETURN_WINDOW_DAYS must be an integer between 0 and 365';
    },
    MAX_DISCOUNT_PERCENT_CASHIER: (v) => {
        const n = Number(v);
        if (isNaN(n) || n < 0 || n > 100)
            return 'MAX_DISCOUNT_PERCENT_CASHIER must be a number between 0 and 100';
    },
    SESSION_TIMEOUT_MINUTES: (v) => {
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 1440)
            return 'SESSION_TIMEOUT_MINUTES must be an integer between 1 and 1440';
    },
    STORE_NAME: (v) => {
        if (v.length < 1 || v.length > 160)
            return 'STORE_NAME must be 1–160 characters';
    },
    STORE_ADDRESS: (v) => {
        if (v.length > 500)
            return 'STORE_ADDRESS must be at most 500 characters';
    },
    STORE_PHONE: (v) => {
        if (v.length > 40)
            return 'STORE_PHONE must be at most 40 characters';
    },
};
let SettingsService = class SettingsService {
    constructor(repo, auditLogsService) {
        this.repo = repo;
        this.auditLogsService = auditLogsService;
    }
    async findAll() {
        const rows = await this.repo.find({ order: { key: 'ASC' } });
        const map = {};
        for (const row of rows) {
            map[row.key] = row.value;
        }
        return map;
    }
    async updateMany(dto, userId) {
        const errors = [];
        for (const item of dto.settings) {
            const validator = SETTING_VALIDATORS[item.key];
            if (!validator) {
                errors.push(`Unknown setting key: ${item.key}`);
                continue;
            }
            const msg = validator(item.value);
            if (msg) {
                errors.push(msg);
            }
        }
        if (errors.length > 0) {
            throw new common_1.BadRequestException(errors);
        }
        for (const item of dto.settings) {
            const existing = await this.repo.findOneBy({ key: item.key });
            if (!existing) {
                throw new common_1.NotFoundException(`Setting not found: ${item.key}`);
            }
            existing.value = item.value;
            existing.updatedBy = userId;
            await this.repo.save(existing);
        }
        await this.auditLogsService.log({
            userId,
            action: 'SETTINGS_UPDATED',
            entityType: 'SETTINGS',
            metadataJson: {
                keys: dto.settings.map((s) => s.key),
            },
        });
        return this.findAll();
    }
};
exports.SettingsService = SettingsService;
exports.SettingsService = SettingsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(app_setting_entity_1.AppSetting)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        audit_logs_service_1.AuditLogsService])
], SettingsService);
//# sourceMappingURL=settings.service.js.map