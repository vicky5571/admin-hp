import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Product } from '../../catalog/entities/product.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';
import { GoodsReceipt } from './goods-receipt.entity';
import { GoodsReceiptItemImei } from './goods-receipt-item-imei.entity';

@Entity('goods_receipt_items')
export class GoodsReceiptItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'goods_receipt_id', type: 'bigint' })
  goodsReceiptId: number;

  @Column({ name: 'po_item_id', type: 'bigint' })
  poItemId: number;

  @Column({ name: 'product_id', type: 'bigint' })
  productId: number;

  @Column({ name: 'received_qty', type: 'int' })
  receivedQty: number;

  @Column({ name: 'unit_cost', type: 'numeric', precision: 14, scale: 2 })
  unitCost: string;

  @Column({ name: 'actual_unit_cost', type: 'numeric', precision: 14, scale: 2, nullable: true })
  actualUnitCost: string | null;

  @Column({ name: 'condition_status', type: 'varchar', length: 30, default: 'GOOD' })
  conditionStatus: string;

  @Column({ name: 'condition_notes', type: 'text', nullable: true })
  conditionNotes: string | null;

  @ManyToOne(() => GoodsReceipt, (gr) => gr.items)
  @JoinColumn({ name: 'goods_receipt_id' })
  goodsReceipt: GoodsReceipt;

  @ManyToOne(() => PurchaseOrderItem)
  @JoinColumn({ name: 'po_item_id' })
  poItem: PurchaseOrderItem;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @OneToMany(() => GoodsReceiptItemImei, (link) => link.goodsReceiptItem, {
    cascade: true,
    eager: true,
  })
  imeis: GoodsReceiptItemImei[];
}
