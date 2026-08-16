"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runSeeders = runSeeders;
const seed_roles_1 = require("./seed.roles");
const seed_tax_classes_1 = require("./seed.tax-classes");
const seed_app_settings_1 = require("./seed.app-settings");
const seed_admin_user_1 = require("./seed.admin-user");
async function runSeeders(dataSource) {
    await dataSource.initialize();
    try {
        await (0, seed_roles_1.seedRoles)(dataSource);
        await (0, seed_tax_classes_1.seedTaxClasses)(dataSource);
        await (0, seed_app_settings_1.seedAppSettings)(dataSource);
        await (0, seed_admin_user_1.seedAdminUser)(dataSource);
        console.log('[seed] all seeders completed');
    }
    catch (err) {
        console.error('[seed] failed:', err);
        process.exitCode = 1;
    }
    finally {
        await dataSource.destroy();
    }
}
//# sourceMappingURL=run-seeders.js.map