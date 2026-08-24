import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSalesPersonToSales1700000000011 implements MigrationInterface {
  name = 'AddSalesPersonToSales1700000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "sales_person_id" BIGINT REFERENCES "users"("id") ON DELETE SET NULL;
      CREATE INDEX IF NOT EXISTS "idx_sales_sales_person_id" ON "sales"("sales_person_id");

      -- Backfill existing sales to set sales_person_id = cashier_id
      UPDATE "sales"
      SET "sales_person_id" = "cashier_id"
      WHERE "sales_person_id" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_sales_sales_person_id";
      ALTER TABLE "sales" DROP COLUMN IF EXISTS "sales_person_id";
    `);
  }
}
