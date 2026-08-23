import { MigrationInterface, QueryRunner } from 'typeorm';

export class ShiftsAndIdempotencySchema1700000000007 implements MigrationInterface {
  name = 'ShiftsAndIdempotencySchema1700000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create cashier_shifts table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cashier_shifts" (
        "id" BIGSERIAL PRIMARY KEY,
        "user_id" BIGINT NOT NULL,
        "register_name" VARCHAR(50) NOT NULL DEFAULT 'Register 1',
        "status" VARCHAR(20) NOT NULL DEFAULT 'OPEN',
        "opened_at" TIMESTAMP NOT NULL DEFAULT now(),
        "closed_at" TIMESTAMP,
        "opening_balance" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "total_cash_sales" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "total_cash_refunds" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "total_cash_in" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "total_cash_out" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "expected_ending_cash" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "actual_ending_cash" NUMERIC(14,2),
        "cash_difference" NUMERIC(14,2),
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_shift_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      );
      CREATE INDEX IF NOT EXISTS "idx_shifts_user" ON "cashier_shifts"("user_id");
      CREATE INDEX IF NOT EXISTS "idx_shifts_status" ON "cashier_shifts"("status");
    `);

    // 2. Create cash_movements table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cash_movements" (
        "id" BIGSERIAL PRIMARY KEY,
        "shift_id" BIGINT NOT NULL,
        "user_id" BIGINT NOT NULL,
        "movement_type" VARCHAR(20) NOT NULL,
        "amount" NUMERIC(14,2) NOT NULL CHECK ("amount" > 0),
        "reason" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cm_shift" FOREIGN KEY ("shift_id") REFERENCES "cashier_shifts"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_cm_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      );
      CREATE INDEX IF NOT EXISTS "idx_cm_shift" ON "cash_movements"("shift_id");
    `);

    // 3. Add idempotency_key and shift_id to sales
    await queryRunner.query(`
      ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
      ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "shift_id" BIGINT;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_sales_idempotency" ON "sales"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
      CREATE INDEX IF NOT EXISTS "idx_sales_shift" ON "sales"("shift_id");
    `);

    // 4. Add idempotency_key to goods_receipts
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "idempotency_key" VARCHAR(100);
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_gr_idempotency" ON "goods_receipts"("idempotency_key") WHERE "idempotency_key" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_gr_idempotency";`);
    await queryRunner.query(`ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "idempotency_key";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_shift";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "uq_sales_idempotency";`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN IF EXISTS "shift_id";`);
    await queryRunner.query(`ALTER TABLE "sales" DROP COLUMN IF EXISTS "idempotency_key";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_cm_shift";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cash_movements";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shifts_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_shifts_user";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "cashier_shifts";`);
  }
}
