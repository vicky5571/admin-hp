import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { PurchaseOrder } from './purchase-order.entity';
import { GoodsReceiptItem } from './goods-receipt-item.entity';

@Entity('goods_receipts')
export class GoodsReceipt {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'grn_number', type: 'varchar', length: 40, unique: true })
  grnNumber: string;

  @Column({ name: 'purchase_order_id', type: 'bigint' })
  purchaseOrderId: number;

  @Column({ name: 'receive_date', type: 'timestamp' })
  receiveDate: Date;

  @Column({ name: 'received_by', type: 'bigint' })
  receivedBy: number;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'supplier_do_number', type: 'varchar', length: 60, nullable: true })
  supplierDoNumber: string | null;

  @Column({ name: 'carrier_name', type: 'varchar', length: 120, nullable: true })
  carrierName: string | null;

  @Column({ name: 'tracking_number', type: 'varchar', length: 120, nullable: true })
  trackingNumber: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => PurchaseOrder)
  @JoinColumn({ name: 'purchase_order_id' })
  purchaseOrder: PurchaseOrder;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'received_by' })
  receiver: User;

  @OneToMany(() => GoodsReceiptItem, (item) => item.goodsReceipt, {
    cascade: true,
    eager: true,
  })
  items: GoodsReceiptItem[];
}
