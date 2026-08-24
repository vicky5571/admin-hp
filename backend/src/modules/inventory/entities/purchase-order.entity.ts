import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PoPaymentStatus } from '../../../common/enums/po-payment-status.enum';
import { PoStatus } from '../../../common/enums/po-status.enum';
import { User } from '../../users/entities/user.entity';
import { Supplier } from './supplier.entity';
import { PurchaseOrderItem } from './purchase-order-item.entity';

@Entity('purchase_orders')
export class PurchaseOrder {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'po_number', type: 'varchar', length: 40, unique: true })
  poNumber: string;

  @Column({ name: 'supplier_id', type: 'bigint', nullable: true })
  supplierId: number | null;

  @Column({ type: 'varchar', length: 20 })
  status: PoStatus;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 20,
    default: PoPaymentStatus.UNPAID,
  })
  paymentStatus: PoPaymentStatus;

  @Column({ name: 'payment_due_date', type: 'date', nullable: true })
  paymentDueDate: string | null;

  @Column({
    name: 'paid_amount',
    type: 'numeric',
    precision: 14,
    scale: 2,
    default: '0.00',
  })
  paidAmount: string;

  @Column({ name: 'paid_at', type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ name: 'order_date', type: 'date' })
  orderDate: string;

  @Column({ name: 'expected_date', type: 'date', nullable: true })
  expectedDate: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ name: 'created_by', type: 'bigint' })
  createdBy: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @ManyToOne(() => Supplier, { nullable: true })
  @JoinColumn({ name: 'supplier_id' })
  supplier: Supplier | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @OneToMany(() => PurchaseOrderItem, (item) => item.purchaseOrder, {
    cascade: true,
    eager: true,
  })
  items: PurchaseOrderItem[];
}
