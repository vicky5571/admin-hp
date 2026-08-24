import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakePoSupplierOptional1700000000009 implements MigrationInterface {
  name = 'MakePoSupplierOptional1700000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "purchase_orders" ALTER COLUMN "supplier_id" SET NOT NULL;
    `);
  }
}
