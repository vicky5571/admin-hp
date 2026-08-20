import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddGoodsReceiptExtendedFields1700000000006 implements MigrationInterface {
  name = 'AddGoodsReceiptExtendedFields1700000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // goods_receipts extra columns
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "supplier_do_number" VARCHAR(60);
      ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "carrier_name" VARCHAR(120);
      ALTER TABLE "goods_receipts" ADD COLUMN IF NOT EXISTS "tracking_number" VARCHAR(120);
    `);

    // goods_receipt_items extra columns
    await queryRunner.query(`
      ALTER TABLE "goods_receipt_items" ADD COLUMN IF NOT EXISTS "actual_unit_cost" NUMERIC(14,2);
      ALTER TABLE "goods_receipt_items" ADD COLUMN IF NOT EXISTS "condition_status" VARCHAR(30) DEFAULT 'GOOD';
      ALTER TABLE "goods_receipt_items" ADD COLUMN IF NOT EXISTS "condition_notes" TEXT;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "supplier_do_number";
      ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "carrier_name";
      ALTER TABLE "goods_receipts" DROP COLUMN IF EXISTS "tracking_number";
      ALTER TABLE "goods_receipt_items" DROP COLUMN IF EXISTS "actual_unit_cost";
      ALTER TABLE "goods_receipt_items" DROP COLUMN IF EXISTS "condition_status";
      ALTER TABLE "goods_receipt_items" DROP COLUMN IF EXISTS "condition_notes";
    `);
  }
}
