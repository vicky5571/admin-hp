"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedTaxClasses = seedTaxClasses;
const tax_class_entity_1 = require("../../modules/catalog/entities/tax-class.entity");
async function seedTaxClasses(dataSource) {
    const repo = dataSource.getRepository(tax_class_entity_1.TaxClass);
    const rows = [
        { name: 'VAT11_EXCLUSIVE', ratePercent: '11.00', isInclusive: false },
        { name: 'VAT11_INCLUSIVE', ratePercent: '11.00', isInclusive: true },
        { name: 'NON_TAX', ratePercent: '0.00', isInclusive: false },
    ];
    for (const row of rows) {
        const exists = await repo.findOneBy({ name: row.name });
        if (!exists) {
            await repo.save(repo.create(row));
        }
    }
    console.log('[seed] tax_classes: ok');
}
//# sourceMappingURL=seed.tax-classes.js.map