import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { CashierShift } from './cashier-shift.entity';

export enum CashMovementType {
  CASH_IN = 'CASH_IN',
  CASH_OUT = 'CASH_OUT',
}

@Entity('cash_movements')
export class CashMovement {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: number;

  @Column({ name: 'shift_id', type: 'bigint' })
  shiftId: number;

  @Column({ name: 'user_id', type: 'bigint' })
  userId: number;

  @Column({ name: 'movement_type', type: 'varchar', length: 20 })
  movementType: CashMovementType;

  @Column({ type: 'numeric', precision: 14, scale: 2 })
  amount: string;

  @Column({ type: 'text' })
  reason: string;

  @ManyToOne(() => CashierShift, (shift) => shift.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'shift_id' })
  shift: CashierShift;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
