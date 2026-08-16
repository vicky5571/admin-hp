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
exports.ReportsController = void 0;
const common_1 = require("@nestjs/common");
const roles_decorator_1 = require("../../common/decorators/roles.decorator");
const role_enum_1 = require("../../common/enums/role.enum");
const jwt_auth_guard_1 = require("../../common/guards/jwt-auth.guard");
const roles_guard_1 = require("../../common/guards/roles.guard");
const reports_dto_1 = require("./dto/reports.dto");
const reports_service_1 = require("./reports.service");
let ReportsController = class ReportsController {
    constructor(service) {
        this.service = service;
    }
    salesSummary(query) {
        return this.service.salesSummary(query);
    }
    salesByProduct(query) {
        return this.service.salesByProduct(query);
    }
    salesByCashier(query) {
        return this.service.salesByCashier(query);
    }
    paymentBreakdown(query) {
        return this.service.paymentBreakdown(query);
    }
    grossProfit(query) {
        return this.service.grossProfit(query);
    }
    stockOnHand(query) {
        return this.service.stockOnHand(query);
    }
    stockMovements(query) {
        return this.service.stockMovements(query);
    }
    returnsSummary(query) {
        return this.service.returnsSummary(query);
    }
};
exports.ReportsController = ReportsController;
__decorate([
    (0, common_1.Get)('sales-summary'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.SalesSummaryQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "salesSummary", null);
__decorate([
    (0, common_1.Get)('sales-by-product'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "salesByProduct", null);
__decorate([
    (0, common_1.Get)('sales-by-cashier'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "salesByCashier", null);
__decorate([
    (0, common_1.Get)('payment-breakdown'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "paymentBreakdown", null);
__decorate([
    (0, common_1.Get)('gross-profit'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "grossProfit", null);
__decorate([
    (0, common_1.Get)('stock-on-hand'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN, role_enum_1.RoleName.INVENTORY),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.StockOnHandQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "stockOnHand", null);
__decorate([
    (0, common_1.Get)('stock-movements'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN, role_enum_1.RoleName.INVENTORY),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.StockMovementsQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "stockMovements", null);
__decorate([
    (0, common_1.Get)('returns-summary'),
    (0, roles_decorator_1.Roles)(role_enum_1.RoleName.OWNER, role_enum_1.RoleName.ADMIN),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [reports_dto_1.DateRangeQueryDto]),
    __metadata("design:returntype", void 0)
], ReportsController.prototype, "returnsSummary", null);
exports.ReportsController = ReportsController = __decorate([
    (0, common_1.Controller)('reports'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard, roles_guard_1.RolesGuard),
    __metadata("design:paramtypes", [reports_service_1.ReportsService])
], ReportsController);
//# sourceMappingURL=reports.controller.js.map