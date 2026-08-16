import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { RestockType } from '../../../common/enums/restock-type.enum';
import { Product } from '../../catalog/entities/product.entity';
import { Return } from './return.entity';
import { ReturnItemImei } from './return-item-imei.entity';
import { SaleItem } from './sale-item.entity';

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'return_id', type: 'bigint' })
  returnId: number;

  @Column({ name: 'sale_item_id', type: 'bigint' })
  saleItemId: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ type: 'int' })
  qty: number;

  @Column({ name: 'unit_refund', type: 'numeric', precision: 14, scale: 2 })
  unitRefund: string;

  @Column({
    name: 'line_refund_total',
    type: 'numeric',
    precision: 14,
    scale: 2,
  })
  lineRefundTotal: string;

  @Column({ name: 'restock_type', type: 'varchar', length: 20 })
  restockType: RestockType;

  @ManyToOne(() => Return, (ret) => ret.items)
  @JoinColumn({ name: 'return_id' })
  ret: Return;

  @ManyToOne(() => SaleItem)
  @JoinColumn({ name: 'sale_item_id' })
  saleItem: SaleItem;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => ReturnItemImei, (link) => link.returnItem, {
    cascade: true,
    eager: true,
  })
  imeis: ReturnItemImei[];
}
