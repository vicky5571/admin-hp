"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedRoles = seedRoles;
const role_entity_1 = require("../../modules/roles/entities/role.entity");
const role_enum_1 = require("../../common/enums/role.enum");
async function seedRoles(dataSource) {
    const repo = dataSource.getRepository(role_entity_1.Role);
    const rows = [
        { name: role_enum_1.RoleName.OWNER, description: 'Full control' },
        { name: role_enum_1.RoleName.ADMIN, description: 'System admin' },
        { name: role_enum_1.RoleName.CASHIER, description: 'POS operations' },
        { name: role_enum_1.RoleName.INVENTORY, description: 'Stock operations' },
        { name: role_enum_1.RoleName.SUPERVISOR, description: 'Approval operations' },
    ];
    for (const row of rows) {
        const exists = await repo.findOneBy({ name: row.name });
        if (!exists) {
            await repo.save(repo.create(row));
        }
    }
    console.log('[seed] roles: ok');
}
//# sourceMappingURL=seed.roles.js.map