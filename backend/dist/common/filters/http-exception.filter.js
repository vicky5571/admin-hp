"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var HttpExceptionFilter_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpExceptionFilter = void 0;
const common_1 = require("@nestjs/common");
let HttpExceptionFilter = HttpExceptionFilter_1 = class HttpExceptionFilter {
    constructor() {
        this.logger = new common_1.Logger(HttpExceptionFilter_1.name);
    }
    catch(exception, host) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        if (exception instanceof common_1.HttpException) {
            const status = exception.getStatus();
            const payload = exception.getResponse();
            const message = typeof payload === 'string'
                ? payload
                : (payload.message ??
                    exception.message);
            return response.status(status).json({
                success: false,
                error: {
                    code: this.mapCode(status),
                    message: Array.isArray(message) ? message[0] : message,
                    details: Array.isArray(message) ? message : [],
                },
            });
        }
        this.logger.error('Unhandled server exception:', exception);
        const errorMessage = process.env.NODE_ENV === 'development' && exception instanceof Error
            ? exception.message
            : 'Unexpected server error';
        return response.status(common_1.HttpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            error: {
                code: 'INTERNAL_ERROR',
                message: errorMessage,
                details: [],
            },
        });
    }
    mapCode(status) {
        switch (status) {
            case common_1.HttpStatus.UNAUTHORIZED:
                return 'UNAUTHORIZED';
            case common_1.HttpStatus.FORBIDDEN:
                return 'FORBIDDEN';
            case common_1.HttpStatus.NOT_FOUND:
                return 'NOT_FOUND';
            case common_1.HttpStatus.CONFLICT:
                return 'CONFLICT';
            case common_1.HttpStatus.UNPROCESSABLE_ENTITY:
                return 'VALIDATION_ERROR';
            case common_1.HttpStatus.BAD_REQUEST:
                return 'VALIDATION_ERROR';
            default:
                return 'INTERNAL_ERROR';
        }
    }
};
exports.HttpExceptionFilter = HttpExceptionFilter;
exports.HttpExceptionFilter = HttpExceptionFilter = HttpExceptionFilter_1 = __decorate([
    (0, common_1.Catch)()
], HttpExceptionFilter);
//# sourceMappingURL=http-exception.filter.js.map