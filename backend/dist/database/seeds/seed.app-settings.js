"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAppSettings = seedAppSettings;
const app_setting_entity_1 = require("../../modules/settings/entities/app-setting.entity");
async function seedAppSettings(dataSource) {
    const repo = dataSource.getRepository(app_setting_entity_1.AppSetting);
    const rows = [
        { key: 'CURRENCY_CODE', value: 'IDR' },
        { key: 'TAX_MODE', value: 'EXCLUSIVE' },
        { key: 'TAX_DEFAULT_RATE', value: '11.00' },
        { key: 'RECEIPT_PREFIX', value: 'INV' },
        { key: 'RECEIPT_FOOTER', value: 'Thank you for shopping with us!' },
        { key: 'RETURN_WINDOW_DAYS', value: '7' },
        { key: 'MAX_DISCOUNT_PERCENT_CASHIER', value: '5' },
        { key: 'SESSION_TIMEOUT_MINUTES', value: '30' },
        { key: 'STORE_NAME', value: 'SmartStore' },
        { key: 'STORE_ADDRESS', value: '' },
        { key: 'STORE_PHONE', value: '' },
    ];
    for (const row of rows) {
        const exists = await repo.findOneBy({ key: row.key });
        if (!exists) {
            await repo.save(repo.create(row));
        }
    }
    console.log('[seed] app_settings: ok');
}
//# sourceMappingURL=seed.app-settings.js.map