import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../modules/users/entities/user.entity';
import { Role } from '../../modules/roles/entities/role.entity';
import { RoleName } from '../../common/enums/role.enum';

export async function seedAdminUser(dataSource: DataSource): Promise<void> {
  const userRepo = dataSource.getRepository(User);
  const roleRepo = dataSource.getRepository(Role);

  const accounts = [
    {
      fullName: 'Store Owner',
      username: 'owner',
      email: 'owner@smartstore.local',
      password: 'owner123',
      roleName: RoleName.OWNER,
    },
    {
      fullName: 'System Admin',
      username: 'admin',
      email: 'admin@smartstore.local',
      password: 'admin123',
      roleName: RoleName.ADMIN,
    },
  ];

  for (const acc of accounts) {
    const exists = await userRepo.findOne({ where: { username: acc.username } });
    if (exists) {
      console.log(`[seed] user "${acc.username}" already exists — skipped`);
      continue;
    }

    const role = await roleRepo.findOneBy({ name: acc.roleName });
    if (!role) {
      throw new Error(`Role "${acc.roleName}" not found. Run role seeder first.`);
    }

    const passwordHash = await bcrypt.hash(acc.password, 10);

    await userRepo.save(
      userRepo.create({
        fullName: acc.fullName,
        username: acc.username,
        email: acc.email,
        passwordHash,
        roleId: Number(role.id),
        isActive: true,
      }),
    );

    console.log(
      `[seed] user "${acc.username}" created (role: ${acc.roleName}, password: ${acc.password})`,
    );
  }
}
