import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn, UpdateDateColumn } from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';

@Entity('stock_balances')
export class StockBalance {
  @PrimaryColumn({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ name: 'on_hand_qty', type: 'int', default: 0 })
  onHandQty: number;

  @Column({ name: 'reserved_qty', type: 'int', default: 0 })
  reservedQty: number;

  @OneToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
