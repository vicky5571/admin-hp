import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddImeiPricing1700000000008 implements MigrationInterface {
  name = 'AddImeiPricing1700000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "imei_units" ADD COLUMN IF NOT EXISTS "cost_price" NUMERIC(14,2);
      ALTER TABLE "imei_units" ADD COLUMN IF NOT EXISTS "selling_price" NUMERIC(14,2);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "imei_units" DROP COLUMN IF EXISTS "cost_price";
      ALTER TABLE "imei_units" DROP COLUMN IF EXISTS "selling_price";
    `);
  }
}
