import { DataSource } from 'typeorm';
import { seedRoles } from './seed.roles';
import { seedTaxClasses } from './seed.tax-classes';
import { seedAppSettings } from './seed.app-settings';
import { seedAdminUser } from './seed.admin-user';
import { seedDemoData } from './seed.demo-data';

export async function runSeeders(dataSource: DataSource): Promise<void> {
  await dataSource.initialize();
  try {
    await seedRoles(dataSource);
    await seedTaxClasses(dataSource);
    await seedAppSettings(dataSource);
    await seedAdminUser(dataSource);
    await seedDemoData(dataSource);
    console.log('[seed] all seeders completed');
  } catch (err) {
    console.error('[seed] failed:', err);
    process.exitCode = 1;
  } finally {
    await dataSource.destroy();
  }
}
