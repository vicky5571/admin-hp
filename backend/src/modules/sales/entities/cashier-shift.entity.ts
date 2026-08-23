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
import { CashMovement } from './cash-movement.entity';
import { Sale } from './sale.entity';

export enum ShiftStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

@Entity('cashier_shifts')
export class CashierShift {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ name: 'register_name', type: 'varchar', length: 50, default: 'Register 1' })
  registerName: string;

  @Column({ type: 'varchar', length: 20, default: ShiftStatus.OPEN })
  status: ShiftStatus;

  @Column({ name: 'opened_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  openedAt: Date;

  @Column({ name: 'closed_at', type: 'timestamp', nullable: true })
  closedAt: Date | null;

  @Column({ name: 'opening_balance', type: 'numeric', precision: 14, scale: 2, default: 0 })
  openingBalance: string;

  @Column({ name: 'total_cash_sales', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCashSales: string;

  @Column({ name: 'total_cash_refunds', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCashRefunds: string;

  @Column({ name: 'total_cash_in', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCashIn: string;

  @Column({ name: 'total_cash_out', type: 'numeric', precision: 14, scale: 2, default: 0 })
  totalCashOut: string;

  @Column({ name: 'expected_ending_cash', type: 'numeric', precision: 14, scale: 2, default: 0 })
  expectedEndingCash: string;

  @Column({ name: 'actual_ending_cash', type: 'numeric', precision: 14, scale: 2, nullable: true })
  actualEndingCash: string | null;

  @Column({ name: 'cash_difference', type: 'numeric', precision: 14, scale: 2, nullable: true })
  cashDifference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => CashMovement, (cm) => cm.shift)
  movements: CashMovement[];

  @OneToMany(() => Sale, (sale) => sale.shift)
  sales: Sale[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
