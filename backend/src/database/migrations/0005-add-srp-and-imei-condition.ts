import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSrpAndImeiCondition1700000000005 implements MigrationInterface {
  name = 'AddSrpAndImeiCondition1700000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Rename selling_price to srp if selling_price exists, or add srp column
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'selling_price'
        ) THEN
          ALTER TABLE "products" RENAME COLUMN "selling_price" TO "srp";
        ELSIF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'products' AND column_name = 'srp'
        ) THEN
          ALTER TABLE "products" ADD COLUMN "srp" NUMERIC(14,2) NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);

    // 2. Add condition_grade and battery_health to imei_units if they do not exist
    await queryRunner.query(`
      ALTER TABLE "imei_units" ADD COLUMN IF NOT EXISTS "condition_grade" VARCHAR(20);
      ALTER TABLE "imei_units" ADD COLUMN IF NOT EXISTS "battery_health" INTEGER;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "imei_units" DROP COLUMN IF EXISTS "condition_grade";
      ALTER TABLE "imei_units" DROP COLUMN IF EXISTS "battery_health";
    `);
  }
}
