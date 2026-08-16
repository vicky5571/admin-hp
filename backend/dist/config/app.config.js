"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = () => ({
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    timezone: process.env.APP_TIMEZONE ?? 'Asia/Jakarta',
    currencyCode: process.env.CURRENCY_CODE ?? 'IDR',
});
//# sourceMappingURL=app.config.js.map