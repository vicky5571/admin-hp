import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { SaleStatus } from '../../../common/enums/sale-status.enum';
import { User } from '../../users/entities/user.entity';
import { Customer } from './customer.entity';
import { Payment } from './payment.entity';
import { SaleItem } from './sale-item.entity';

@Entity('sales')
export class Sale {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'invoice_number', type: 'varchar', length: 40, unique: true })
  invoiceNumber: string;

  @Column({ name: 'sale_time', type: 'timestamp' })
  saleTime: Date;

  @Column({ name: 'cashier_id', type: 'bigint' })
  cashierId: number;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  customerId: number | null;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  subtotal: string;

  @Column({ name: 'discount_total', type: 'numeric', precision: 14, scale: 2, default: 0 })
  discountTotal: string;

  @Column({ name: 'tax_total', type: 'numeric', precision: 14, scale: 2, default: 0 })
  taxTotal: string;

  @Column({ name: 'grand_total', type: 'numeric', precision: 14, scale: 2 })
  grandTotal: string;

  @Column({ type: 'varchar', length: 20 })
  status: SaleStatus;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @ManyToOne(() => Customer, (customer) => customer.sales)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @OneToMany(() => Payment, (payment) => payment.sale, { cascade: true })
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
