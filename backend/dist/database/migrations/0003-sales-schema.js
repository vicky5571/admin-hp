"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SalesSchema1700000000002 = void 0;
class SalesSchema1700000000002 {
    constructor() {
        this.name = 'SalesSchema1700000000002';
    }
    async up(queryRunner) {
        await queryRunner.query(`
      CREATE TABLE "customers" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(160) NOT NULL,
        "phone" VARCHAR(40),
        "email" VARCHAR(120),
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE "sales" (
        "id" BIGSERIAL PRIMARY KEY,
        "invoice_number" VARCHAR(40) UNIQUE NOT NULL,
        "sale_time" TIMESTAMP NOT NULL,
        "cashier_id" BIGINT NOT NULL,
        "customer_id" BIGINT,
        "subtotal" NUMERIC(14,2) NOT NULL,
        "discount_total" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "tax_total" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "grand_total" NUMERIC(14,2) NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sales_cashier" FOREIGN KEY ("cashier_id") REFERENCES "users"("id"),
        CONSTRAINT "fk_sales_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
      );
      CREATE INDEX "idx_sales_time" ON "sales"("sale_time");
      CREATE INDEX "idx_sales_cashier" ON "sales"("cashier_id");
      CREATE INDEX "idx_sales_status" ON "sales"("status");

      CREATE TABLE "sale_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "sale_id" BIGINT NOT NULL,
        "product_id" BIGINT NOT NULL,
        "qty" INTEGER NOT NULL,
        "unit_price" NUMERIC(14,2) NOT NULL,
        "discount_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "tax_amount" NUMERIC(14,2) NOT NULL DEFAULT 0,
        "line_total" NUMERIC(14,2) NOT NULL,
        CONSTRAINT "fk_si_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_si_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
      CREATE INDEX "idx_sale_items_sale" ON "sale_items"("sale_id");
      CREATE INDEX "idx_sale_items_product" ON "sale_items"("product_id");

      CREATE TABLE "sale_item_imeis" (
        "id" BIGSERIAL PRIMARY KEY,
        "sale_item_id" BIGINT NOT NULL,
        "imei_unit_id" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sii_sale_item" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_sii_imei" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id")
      );
      CREATE INDEX "idx_sii_sale_item" ON "sale_item_imeis"("sale_item_id");

      CREATE TABLE "payments" (
        "id" BIGSERIAL PRIMARY KEY,
        "sale_id" BIGINT NOT NULL,
        "method" VARCHAR(20) NOT NULL,
        "amount" NUMERIC(14,2) NOT NULL,
        "reference_no" VARCHAR(80),
        "paid_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id") ON DELETE CASCADE
      );
      CREATE INDEX "idx_payments_sale" ON "payments"("sale_id");
      CREATE INDEX "idx_payments_method" ON "payments"("method");
    `);
    }
    async down(queryRunner) {
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_method";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_payments_sale";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "payments";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sii_sale_item";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sale_item_imeis";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sale_items_product";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sale_items_sale";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sale_items";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_status";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_cashier";`);
        await queryRunner.query(`DROP INDEX IF EXISTS "idx_sales_time";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "sales";`);
        await queryRunner.query(`DROP TABLE IF EXISTS "customers";`);
    }
}
exports.SalesSchema1700000000002 = SalesSchema1700000000002;
//# sourceMappingURL=0003-sales-schema.js.map