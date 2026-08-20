import { MigrationInterface, QueryRunner } from 'typeorm';

export class InventorySchema1700000000001 implements MigrationInterface {
  name = 'InventorySchema1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Categories + Brands (referenced by products)
    await queryRunner.query(`
      CREATE TABLE "categories" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(80) UNIQUE NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE "brands" (
        "id" BIGSERIAL PRIMARY KEY,
        "name" VARCHAR(80) UNIQUE NOT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE "products" (
        "id" BIGSERIAL PRIMARY KEY,
        "sku" VARCHAR(60) UNIQUE NOT NULL,
        "name" VARCHAR(160) NOT NULL,
        "category_id" BIGINT,
        "brand_id" BIGINT,
        "product_type" VARCHAR(20) NOT NULL,
        "cost_price" NUMERIC(14,2) NOT NULL CHECK ("cost_price" >= 0),
        "srp" NUMERIC(14,2) NOT NULL CHECK ("srp" >= 0),
        "tax_class_id" BIGINT,
        "min_stock_alert" INTEGER NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_products_category" FOREIGN KEY ("category_id") REFERENCES "categories"("id"),
        CONSTRAINT "fk_products_brand" FOREIGN KEY ("brand_id") REFERENCES "brands"("id"),
        CONSTRAINT "fk_products_tax_class" FOREIGN KEY ("tax_class_id") REFERENCES "tax_classes"("id")
      );
      CREATE INDEX "idx_products_category" ON "products"("category_id");
      CREATE INDEX "idx_products_brand" ON "products"("brand_id");
      CREATE INDEX "idx_products_type" ON "products"("product_type");
      CREATE INDEX "idx_products_active" ON "products"("is_active");

      CREATE TABLE "suppliers" (
        "id" BIGSERIAL PRIMARY KEY,
        "supplier_code" VARCHAR(40) UNIQUE NOT NULL,
        "name" VARCHAR(160) NOT NULL,
        "contact_person" VARCHAR(120),
        "phone" VARCHAR(40),
        "email" VARCHAR(120),
        "address" TEXT,
        "payment_terms_days" INTEGER NOT NULL DEFAULT 0 CHECK ("payment_terms_days" >= 0),
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now()
      );

      CREATE TABLE "imei_units" (
        "id" BIGSERIAL PRIMARY KEY,
        "imei" VARCHAR(30) UNIQUE NOT NULL,
        "product_id" BIGINT NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "current_location" VARCHAR(30) NOT NULL DEFAULT 'STORE',
        "last_ref_type" VARCHAR(30),
        "last_ref_id" BIGINT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_imei_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
      CREATE INDEX "idx_imei_product" ON "imei_units"("product_id");
      CREATE INDEX "idx_imei_status" ON "imei_units"("status");

      CREATE TABLE "purchase_orders" (
        "id" BIGSERIAL PRIMARY KEY,
        "po_number" VARCHAR(40) UNIQUE NOT NULL,
        "supplier_id" BIGINT NOT NULL,
        "status" VARCHAR(20) NOT NULL,
        "order_date" DATE NOT NULL,
        "expected_date" DATE,
        "notes" TEXT,
        "created_by" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_po_supplier" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id"),
        CONSTRAINT "fk_po_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
      );
      CREATE INDEX "idx_po_supplier" ON "purchase_orders"("supplier_id");
      CREATE INDEX "idx_po_status" ON "purchase_orders"("status");

      CREATE TABLE "purchase_order_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "purchase_order_id" BIGINT NOT NULL,
        "product_id" BIGINT NOT NULL,
        "ordered_qty" INTEGER NOT NULL CHECK ("ordered_qty" > 0),
        "received_qty" INTEGER NOT NULL DEFAULT 0 CHECK ("received_qty" >= 0),
        "unit_cost" NUMERIC(14,2) NOT NULL CHECK ("unit_cost" >= 0),
        CONSTRAINT "uq_po_item" UNIQUE ("purchase_order_id", "product_id"),
        CONSTRAINT "fk_poi_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_poi_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );

      CREATE TABLE "goods_receipts" (
        "id" BIGSERIAL PRIMARY KEY,
        "grn_number" VARCHAR(40) UNIQUE NOT NULL,
        "purchase_order_id" BIGINT NOT NULL,
        "receive_date" TIMESTAMP NOT NULL,
        "received_by" BIGINT NOT NULL,
        "notes" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_gr_po" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id"),
        CONSTRAINT "fk_gr_receiver" FOREIGN KEY ("received_by") REFERENCES "users"("id")
      );

      CREATE TABLE "goods_receipt_items" (
        "id" BIGSERIAL PRIMARY KEY,
        "goods_receipt_id" BIGINT NOT NULL,
        "po_item_id" BIGINT NOT NULL,
        "product_id" BIGINT NOT NULL,
        "received_qty" INTEGER NOT NULL CHECK ("received_qty" > 0),
        "unit_cost" NUMERIC(14,2) NOT NULL CHECK ("unit_cost" >= 0),
        CONSTRAINT "fk_gri_gr" FOREIGN KEY ("goods_receipt_id") REFERENCES "goods_receipts"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_gri_poi" FOREIGN KEY ("po_item_id") REFERENCES "purchase_order_items"("id"),
        CONSTRAINT "fk_gri_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );

      CREATE TABLE "goods_receipt_item_imeis" (
        "id" BIGSERIAL PRIMARY KEY,
        "goods_receipt_item_id" BIGINT NOT NULL,
        "imei_unit_id" BIGINT NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "uq_grn_item_imei" UNIQUE ("goods_receipt_item_id", "imei_unit_id"),
        CONSTRAINT "uq_imei_once_per_receive" UNIQUE ("imei_unit_id"),
        CONSTRAINT "fk_grii_gri" FOREIGN KEY ("goods_receipt_item_id") REFERENCES "goods_receipt_items"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_grii_imei" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id")
      );

      CREATE TABLE "stock_movements" (
        "id" BIGSERIAL PRIMARY KEY,
        "movement_time" TIMESTAMP NOT NULL DEFAULT now(),
        "product_id" BIGINT NOT NULL,
        "imei_unit_id" BIGINT,
        "movement_type" VARCHAR(20) NOT NULL,
        "qty" INTEGER NOT NULL,
        "unit_cost" NUMERIC(14,2),
        "ref_type" VARCHAR(30) NOT NULL,
        "ref_id" BIGINT NOT NULL,
        "reason_code" VARCHAR(30),
        "created_by" BIGINT NOT NULL,
        "notes" TEXT,
        CONSTRAINT "fk_sm_product" FOREIGN KEY ("product_id") REFERENCES "products"("id"),
        CONSTRAINT "fk_sm_imei" FOREIGN KEY ("imei_unit_id") REFERENCES "imei_units"("id"),
        CONSTRAINT "fk_sm_creator" FOREIGN KEY ("created_by") REFERENCES "users"("id")
      );
      CREATE INDEX "idx_sm_product_time" ON "stock_movements"("product_id", "movement_time");
      CREATE INDEX "idx_sm_ref" ON "stock_movements"("ref_type", "ref_id");
      CREATE INDEX "idx_sm_imei" ON "stock_movements"("imei_unit_id");

      CREATE TABLE "stock_balances" (
        "product_id" BIGINT PRIMARY KEY,
        "on_hand_qty" INTEGER NOT NULL DEFAULT 0,
        "reserved_qty" INTEGER NOT NULL DEFAULT 0,
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "fk_sb_product" FOREIGN KEY ("product_id") REFERENCES "products"("id")
      );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_balances";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sm_imei";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sm_ref";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_sm_product_time";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stock_movements";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipt_item_imeis";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipt_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "goods_receipts";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_order_items";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_po_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_po_supplier";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "purchase_orders";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_imei_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_imei_product";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "imei_units";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "suppliers";`);

    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_active";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_type";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_brand";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_products_category";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "products";`);

    await queryRunner.query(`DROP TABLE IF EXISTS "brands";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "categories";`);
  }
}
