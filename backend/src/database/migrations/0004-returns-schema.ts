import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReturnsSchema1700000000003 implements MigrationInterface {
  name = 'ReturnsSchema1700000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "returns" (
        "id" BIGSERIAL PRIMARY KEY,
        "return_number" VARCHAR(40) UNIQUE NOT NULL,
        "sale_id" BIGINT NOT NULL,
        "processed_by" BIGINT NOT NULL,
        "return_time" TIMESTAMP NOT NULL,
        "refund_total" NUMERIC(14,2) NOT NULL CHECK ("refund_total" >= 0),
        "refund_method" VARCHAR(20) NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "reason" TEXT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_returns_sale" FOREIGN KEY ("sale_id") REFERENCES "sales"("id"),
        CONSTRAINT "fk_returns_processor" FOREIGN KEY ("processed_by") REFERENCES "users"("id")
      );
      CREATE INDEX "idx_returns_sale" ON "returns"("sale_id");
      CREATE INDEX "idx_returns_status" ON "returns"("status");
      CREATE INDEX "idx_returns_time" ON "returns"("return_time");

      CREATE TABLE "return_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "return_id" BIGINT NOT NULL,
        "sale_item_id" BIGINT NOT NULL,
        "product_id" BIGINT NOT NULL,
        "qty" INTEGER NOT NULL CHECK ("qty" > 0),
        "unit_refund" NUMERIC(14,2) NOT NULL CHECK ("unit_refund" >= 0),
        "line_refund_total" NUMERIC(14,2) NOT NULL CHECK ("line_refund_total" >= 0),
        "restock_type" VARCHAR(20) NOT NULL,
        CONSTRAINT "fk_ri_return" FOREIGN KEY ("return_id") REFERENCES "returns"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_ri_sale_item" FOREIGN KEY ("sale_item_id") REFERENCES "sale_items"("id"),
        CONSTRAINT "fk_ri_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
      CREATE INDEX "idx_return_items_return" ON "return_items"("return_id");

      CREATE TABLE "return_item_imeis" (
        "id" BIGSERIAL PRIMARY KEY,
        "return_item_id" BIGINT NOT NULL,
        "imei_unit_id" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_return_item_imei" UNIQUE ("return_item_id", "imei_unit_id"),
        CONSTRAINT "fk_rii_return_item" FOREIGN KEY ("return_item_id") REFERENCES "return_items"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_rii_imei" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id")
      );
      CREATE INDEX "idx_rii_return_item" ON "return_item_imeis"("return_item_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_rii_return_item";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "return_item_imeis";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_return_items_return";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "return_items";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_returns_time";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_returns_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_returns_sale";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "returns";`);
  }
}
