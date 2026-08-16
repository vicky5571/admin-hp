import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProductType } from '../../../common/enums/product-type.enum';
import { Brand } from './brand.entity';
import { Category } from './category.entity';
import { TaxClass } from './tax-class.entity';

@Entity('products')
export class Product {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  sku: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({ name: 'category_id', type: 'bigint', nullable: true })
  categoryId: number | null;

  @Column({ name: 'brand_id', type: 'bigint', nullable: true })
  brandId: number | null;

  @Column({ name: 'product_type', type: 'varchar', length: 20 })
  productType: ProductType;

  @Column({ name: 'cost_price', type: 'numeric', precision: 14, scale: 2 })
  costPrice: string;

  @Column({ name: 'selling_price', type: 'numeric', precision: 14, scale: 2 })
  sellingPrice: string;

  @Column({ name: 'tax_class_id', type: 'bigint', nullable: true })
  taxClassId: number | null;

  @Column({ name: 'min_stock_alert', type: 'int', default: 0 })
  minStockAlert: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive: boolean;

  @ManyToOne(() => Category)
  @JoinColumn({ name: 'category_id' })
  category: Category | null;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand | null;

  @ManyToOne(() => TaxClass)
  @JoinColumn({ name: 'tax_class_id' })
  taxClass: TaxClass | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
