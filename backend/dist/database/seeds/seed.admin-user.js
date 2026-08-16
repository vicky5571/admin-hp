"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedAdminUser = seedAdminUser;
const bcrypt = __importStar(require("bcrypt"));
const user_entity_1 = require("../../modules/users/entities/user.entity");
const role_entity_1 = require("../../modules/roles/entities/role.entity");
const role_enum_1 = require("../../common/enums/role.enum");
async function seedAdminUser(dataSource) {
    const userRepo = dataSource.getRepository(user_entity_1.User);
    const roleRepo = dataSource.getRepository(role_entity_1.Role);
    const accounts = [
        {
            fullName: 'Store Owner',
            username: 'owner',
            email: 'owner@smartstore.local',
            password: 'owner123',
            roleName: role_enum_1.RoleName.OWNER,
        },
        {
            fullName: 'System Admin',
            username: 'admin',
            email: 'admin@smartstore.local',
            password: 'admin123',
            roleName: role_enum_1.RoleName.ADMIN,
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
        await userRepo.save(userRepo.create({
            fullName: acc.fullName,
            username: acc.username,
            email: acc.email,
            passwordHash,
            roleId: Number(role.id),
            isActive: true,
        }));
        console.log(`[seed] user "${acc.username}" created (role: ${acc.roleName}, password: ${acc.password})`);
    }
}
//# sourceMappingURL=seed.admin-user.js.map