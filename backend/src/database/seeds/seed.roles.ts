import { DataSource } from 'typeorm';
import { Role } from '../../modules/roles/entities/role.entity';
import { RoleName } from '../../common/enums/role.enum';

export async function seedRoles(dataSource: DataSource): Promise<void> {
  const repo = dataSource.getRepository(Role);
  const rows = [
    { name: RoleName.OWNER, description: 'Full control' },
    { name: RoleName.ADMIN, description: 'System admin' },
    { name: RoleName.CASHIER, description: 'POS operations' },
    { name: RoleName.INVENTORY, description: 'Stock operations' },
    { name: RoleName.SUPERVISOR, description: 'Approval operations' },
  ];

  for (const row of rows) {
    const exists = await repo.findOneBy({ name: row.name });
    if (!exists) {
      await repo.save(repo.create(row));
    }
  }
  console.log('[seed] roles: ok');
}
