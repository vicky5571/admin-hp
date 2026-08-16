"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InitSchema1700000000000 = void 0;
class InitSchema1700000000000 {
    constructor() {
        this.name = 'InitSchema1700000000000';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "roles" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(50) UNIQUE NOT NULL,
        "description" TEXT
      );

      CREATE TABLE "users" (
        "id" BIGSERIAL PRIMARY KEY,
        "full_name" VARCHAR(120) NOT NULL,
        "username" VARCHAR(60) UNIQUE NOT NULL,
        "email" VARCHAR(120) UNIQUE,
        "password_hash" TEXT NOT NULL,
        "role_id" BIGINT NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "last_login_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_users_role" FOREIGN KEY ("role_id") REFERENCES "roles"("id")
      );
      CREATE INDEX "idx_users_role_id" ON "users"("role_id");
      CREATE INDEX "idx_users_active" ON "users"("is_active");

      CREATE TABLE "tax_classes" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(50) UNIQUE NOT NULL,
        "rate_percent" NUMERIC(5,2) NOT NULL CHECK ("rate_percent" >= 0),
        "is_inclusive" BOOLEAN NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE "app_settings" (
        "key" VARCHAR(80) PRIMARY KEY,
        "value" TEXT NOT NULL,
        "updated_by" BIGINT,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_app_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id")
      );

      CREATE TABLE "audit_logs" (
        "id" BIGSERIAL PRIMARY KEY,
        "event_time" TIMESTAMP NOT NULL DEFAULT now(),
        "user_id" BIGINT,
        "action" VARCHAR(60) NOT NULL,
        "entity_type" VARCHAR(60) NOT NULL,
        "entity_id" BIGINT,
        "metadata_json" JSONB,
        "ip_address" VARCHAR(64),
        CONSTRAINT "fk_audit_logs_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      );
      CREATE INDEX "idx_audit_user_time" ON "audit_logs"("user_id", "event_time");
      CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_entity";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_audit_user_time";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "audit_logs";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "app_settings";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "tax_classes";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_active";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_users_role_id";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "roles";`);
    }
}
exports.InitSchema1700000000000 = InitSchema1700000000000;
//# sourceMappingURL=0001-init-schema.js.map