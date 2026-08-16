import { DataSource } from 'typeorm';
import { TaxClass } from '../../modules/catalog/entities/tax-class.entity';

export async function seedTaxClasses(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(TaxClass);
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
