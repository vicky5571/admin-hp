import { DataSource } from 'typeorm';
import { AppSetting } from '../../modules/settings/entities/app-setting.entity';

export async function seedAppSettings(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(AppSetting);
  const rows: Array<{ key: string; value: string }> = [
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
