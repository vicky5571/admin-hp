import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPoPaymentAndDueDate1700000000010 implements MigrationInterface {
  name = 'AddPoPaymentAndDueDate1700000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(20) NOT NULL DEFAULT 'UNPAID';
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "payment_due_date" DATE;
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paid_amount" NUMERIC(14,2) NOT NULL DEFAULT 0;
      ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMP;

      CREATE INDEX IF NOT EXISTS "idx_po_payment_status" ON "purchase_orders"("payment_status");
      CREATE INDEX IF NOT EXISTS "idx_po_due_date" ON "purchase_orders"("payment_due_date");

      -- Set walk-in completed buybacks to PAID
      UPDATE "purchase_orders"
      SET "payment_status" = 'PAID',
          "paid_amount" = COALESCE((
            SELECT SUM(poi.unit_cost * poi.ordered_qty)
            FROM purchase_order_items poi
            WHERE poi.purchase_order_id = purchase_orders.id
          ), 0)
      WHERE "supplier_id" IS NULL AND "status" = 'COMPLETED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_po_due_date";
      DROP INDEX IF EXISTS "idx_po_payment_status";
      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "paid_at";
      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "paid_amount";
      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "payment_due_date";
      ALTER TABLE "purchase_orders" DROP COLUMN IF EXISTS "payment_status";
    `);
  }
}
