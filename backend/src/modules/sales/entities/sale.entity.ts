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

  @Column({ name: 'sales_person_id', type: 'bigint', nullable: true })
  salesPersonId: number | null;

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

  @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true, unique: true })
  idempotencyKey: string | null;

  @Column({ name: 'shift_id', type: 'bigint', nullable: true })
  shiftId: number | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'cashier_id' })
  cashier: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'sales_person_id' })
  salesPerson: User | null;

  @ManyToOne(() => Customer, (customer) => customer.sales)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer | null;

  @ManyToOne('CashierShift', 'sales', { nullable: true })
  @JoinColumn({ name: 'shift_id' })
  shift: any;

  @OneToMany(() => SaleItem, (item) => item.sale, { cascade: true })
  items: SaleItem[];

  @OneToMany(() => Payment, (payment) => payment.sale, { cascade: true })
  payments: Payment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
