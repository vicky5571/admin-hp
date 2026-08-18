"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const typeorm_1 = require("@nestjs/typeorm");
const app_config_1 = __importDefault(require("./config/app.config"));
const database_config_1 = __importDefault(require("./config/database.config"));
const jwt_config_1 = __importDefault(require("./config/jwt.config"));
const http_exception_filter_1 = require("./common/filters/http-exception.filter");
const response_transform_interceptor_1 = require("./common/interceptors/response-transform.interceptor");
const audit_logs_module_1 = require("./modules/audit-logs/audit-logs.module");
const auth_module_1 = require("./modules/auth/auth.module");
const catalog_module_1 = require("./modules/catalog/catalog.module");
const imei_module_1 = require("./modules/imei/imei.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const reports_module_1 = require("./modules/reports/reports.module");
const roles_module_1 = require("./modules/roles/roles.module");
const sales_module_1 = require("./modules/sales/sales.module");
const settings_module_1 = require("./modules/settings/settings.module");
const users_module_1 = require("./modules/users/users.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [app_config_1.default, database_config_1.default, jwt_config_1.default],
            }),
            typeorm_1.TypeOrmModule.forRootAsync({
                inject: [config_1.ConfigService],
                useFactory: (config) => ({
                    type: 'postgres',
                    host: config.get('database.host'),
                    port: config.get('database.port'),
                    username: config.get('database.user'),
                    password: config.get('database.pass'),
                    database: config.get('database.name'),
                    autoLoadEntities: true,
                    synchronize: false,
                }),
            }),
            roles_module_1.RolesModule,
            users_module_1.UsersModule,
            auth_module_1.AuthModule,
            audit_logs_module_1.AuditLogsModule,
            catalog_module_1.CatalogModule,
            imei_module_1.ImeiModule,
            inventory_module_1.InventoryModule,
            sales_module_1.SalesModule,
            reports_module_1.ReportsModule,
            settings_module_1.SettingsModule,
        ],
        providers: [
            {
                provide: core_1.APP_FILTER,
                useClass: http_exception_filter_1.HttpExceptionFilter,
            },
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: response_transform_interceptor_1.ResponseTransformInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map